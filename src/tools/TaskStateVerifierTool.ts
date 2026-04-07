import * as vscode from 'vscode';

type TaskStateVerifierInput = Record<string, never>;
type TaskStateViewMessage =
  | {
      type: 'save';
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
  constructor(private readonly context: vscode.ExtensionContext) {}

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
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const userProvidedTaskState =
      this.context.workspaceState.get<string>(TASK_STATE_KEY, '');

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(userProvidedTaskState)
    ]);
  }
}

export class TaskStateViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
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
          await syncState();
          return;
        }

        await this.context.workspaceState.update(TASK_STATE_KEY, message.value);
        await webviewView.webview.postMessage({
          type: 'saved',
          value: message.value
        });
      },
      undefined,
      this.context.subscriptions
    );
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
      code {
        font-family: var(--vscode-editor-font-family);
      }
    </style>
  </head>
  <body>
    <h1>Task State</h1>
    <p>
      Save the current task state, approval, or request context here. The
      <code>#taskStateVerifier</code> tool returns this saved text unchanged.
    </p>
    <textarea
      id="taskState"
      placeholder="Describe the current task state"
    ></textarea>
    <div class="actions">
      <button class="primary" id="save">Save Task State</button>
    </div>
    <div class="status" id="status"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const textarea = document.getElementById('taskState');
      const save = document.getElementById('save');
      const status = document.getElementById('status');

      const setStatus = (text) => {
        status.textContent = text;
      };

      save.addEventListener('click', () => {
        vscode.postMessage({ type: 'save', value: textarea.value });
      });

      textarea.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          save.click();
        }
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message) {
          return;
        }
        if (message.type === 'setValue') {
          textarea.value = message.value ?? '';
          setStatus('');
          return;
        }
        if (message.type === 'saved') {
          textarea.value = message.value ?? '';
          setStatus('Saved.');
        }
      });

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
