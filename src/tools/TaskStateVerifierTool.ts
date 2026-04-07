import * as vscode from 'vscode';

type TaskStateVerifierInput = Record<string, never>;
type TaskStateViewMessage =
  | {
      type: 'submit';
      value: string;
    }
  | {
      type: 'ready';
    };

export const TASK_STATE_KEY = 'contextCaddy.taskState';
export const TASK_STATE_VIEW_ID = 'contextCaddy.taskState';

export class TaskStateVerifierTool
  implements vscode.LanguageModelTool<TaskStateVerifierInput>
{
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly taskStateViewProvider: TaskStateViewProvider
  ) {}

  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<TaskStateVerifierInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation | undefined> {
    return {
      invocationMessage: 'Reading saved task state',
      confirmationMessages: {
        title: 'Verify task state',
        message: new vscode.MarkdownString(
          'Allow this tool to read the saved task-state text from Context Caddy and return it to Copilot?'
        )
      }
    };
  }

  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<TaskStateVerifierInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const userProvidedTaskState = await this.taskStateViewProvider.requestTaskState(
      token
    );

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(userProvidedTaskState)
    ]);
  }
}

export class TaskStateViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private pendingVerification?:
    | {
        resolve: (value: string) => void;
      }
    | undefined;
  private viewReadyResolver?: () => void;
  private viewReadyPromise: Promise<void> = new Promise((resolve) => {
    this.viewReadyResolver = resolve;
  });
  private webviewReadyResolver?: () => void;
  private webviewReadyPromise: Promise<void> = new Promise((resolve) => {
    this.webviewReadyResolver = resolve;
  });

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    this.viewReadyResolver?.();
    this.viewReadyResolver = undefined;
    this.resetWebviewReadyPromise();
    webviewView.webview.options = {
      enableScripts: true
    };
    webviewView.webview.html = this.getWebviewHtml();

    const syncState = async (): Promise<void> => {
      const value = this.context.workspaceState.get<string>(TASK_STATE_KEY, '');
      await webviewView.webview.postMessage({ type: 'setValue', value });
    };

    webviewView.webview.onDidReceiveMessage(
      async (message: TaskStateViewMessage) => {
        if (message.type === 'ready') {
          this.webviewReadyResolver?.();
          this.webviewReadyResolver = undefined;
          await syncState();
          await webviewView.webview.postMessage({
            type: 'mode',
            verificationPending: this.pendingVerification !== undefined
          });
          return;
        }

        await this.context.workspaceState.update(TASK_STATE_KEY, message.value);
        await webviewView.webview.postMessage({
          type: 'saved',
          value: message.value
        });
        await this.context.workspaceState.update(TASK_STATE_KEY, '');
        await webviewView.webview.postMessage({
          type: 'setValue',
          value: ''
        });
        await webviewView.webview.postMessage({
          type: 'mode',
          verificationPending: false
        });

        this.pendingVerification?.resolve(message.value);
        this.pendingVerification = undefined;
      },
      undefined,
      this.context.subscriptions
    );

    webviewView.onDidDispose(() => {
      this.view = undefined;
      this.pendingVerification?.resolve('');
      this.pendingVerification = undefined;
      this.resetViewReadyPromise();
      this.resetWebviewReadyPromise();
    });
  }

  async requestTaskState(token: vscode.CancellationToken): Promise<string> {
    if (this.pendingVerification) {
      return '';
    }

    await vscode.commands.executeCommand('workbench.view.extension.contextCaddy');
    const view = await this.waitForView();
    view?.show(false);
    await this.waitForWebviewReady();

    return await new Promise<string>(async (resolve) => {
      this.pendingVerification = { resolve };
      const activeValue = this.context.workspaceState.get<string>(TASK_STATE_KEY, '');

      await view?.webview.postMessage({
        type: 'setValue',
        value: activeValue
      });
      await view?.webview.postMessage({
        type: 'mode',
        verificationPending: true
      });
      await view?.webview.postMessage({
        type: 'focusForVerification'
      });

      token.onCancellationRequested(async () => {
        if (!this.pendingVerification) {
          return;
        }
        this.pendingVerification.resolve('');
        this.pendingVerification = undefined;
        await view?.webview.postMessage({
          type: 'mode',
          verificationPending: false
        });
      });
    });
  }

  private async waitForView(): Promise<vscode.WebviewView | undefined> {
    if (this.view) {
      return this.view;
    }

    await this.viewReadyPromise;
    return this.view;
  }

  private async waitForWebviewReady(): Promise<void> {
    await this.webviewReadyPromise;
  }

  private resetViewReadyPromise(): void {
    this.viewReadyPromise = new Promise((resolve) => {
      this.viewReadyResolver = resolve;
    });
  }

  private resetWebviewReadyPromise(): void {
    this.webviewReadyPromise = new Promise((resolve) => {
      this.webviewReadyResolver = resolve;
    });
  }

  private getWebviewHtml(): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task State</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
        padding: 12px;
      }
      h1 {
        font-size: 16px;
        margin: 0 0 8px;
      }
      p {
        margin: 0 0 10px;
        line-height: 1.5;
      }
      textarea {
        width: 100%;
        min-height: 220px;
        resize: vertical;
        box-sizing: border-box;
        padding: 10px;
        border: 1px solid var(--vscode-input-border, transparent);
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        font: inherit;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      button {
        border: 0;
        padding: 8px 12px;
        cursor: pointer;
        font: inherit;
      }
      .primary {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
      }
      .status {
        color: var(--vscode-descriptionForeground);
        margin-top: 10px;
        min-height: 18px;
      }
      .callout {
        border: 1px solid var(--vscode-inputOption-activeBorder, transparent);
        background: var(--vscode-editor-inactiveSelectionBackground);
        padding: 10px;
        margin: 0 0 10px;
        display: none;
      }
      .callout.visible {
        display: block;
      }
      code {
        font-family: var(--vscode-editor-font-family);
      }
    </style>
  </head>
  <body>
    <h1>Task State</h1>
    <p>
      Save the current task state, approval, or request context here. The
      <code>#taskStateVerifier</code> tool can also focus this box and wait for
      you to submit text during verification.
    </p>
      <div class="callout" id="callout">
        Copilot is waiting for task-state verification. Enter text, then use
        <strong>Submit</strong>.
      </div>
    <textarea
      id="taskState"
      placeholder="Describe the current task state"
    ></textarea>
    <div class="actions">
      <button class="primary" id="submit">Submit</button>
    </div>
    <div class="status" id="status"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const textarea = document.getElementById('taskState');
      const submit = document.getElementById('submit');
      const status = document.getElementById('status');
      const callout = document.getElementById('callout');
      let verificationPending = false;

      const setStatus = (text) => {
        status.textContent = text;
      };

      const renderMode = () => {
        callout.classList.toggle('visible', verificationPending);
        submit.disabled = !verificationPending;
      });

      submit.addEventListener('click', () => {
        vscode.postMessage({ type: 'submit', value: textarea.value });
        setStatus('Submitted.');
      });

      textarea.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          if (verificationPending) {
            submit.click();
            return;
          }
        }
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message) {
          return;
        }
        if (message.type === 'setValue') {
          textarea.value = message.value ?? '';
          if (!verificationPending) {
            setStatus('');
          }
          return;
        }
        if (message.type === 'saved') {
          textarea.value = message.value ?? '';
          return;
        }
        if (message.type === 'mode') {
          verificationPending = Boolean(message.verificationPending);
          renderMode();
          if (!verificationPending) {
            setStatus('');
          }
          return;
        }
        if (message.type === 'focusForVerification') {
          window.setTimeout(() => {
            textarea.focus();
            textarea.select();
          }, 0);
        }
      });

      renderMode();
      vscode.postMessage({ type: 'ready' });
    </script>
  </body>
</html>`;
  }

  private getNonce(): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';

    for (let index = 0; index < 32; index += 1) {
      nonce += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return nonce;
  }
}
