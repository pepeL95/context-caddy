import * as vscode from 'vscode';

type TaskStateVerifierInput = Record<string, never>;
type VerifierMessage =
  | {
      type: 'submit';
      value: string;
    }
  | {
      type: 'cancel';
    };

export class TaskStateVerifierTool
  implements vscode.LanguageModelTool<TaskStateVerifierInput>
{
  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<TaskStateVerifierInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation | undefined> {
    return {
      invocationMessage: 'Verifying task state with the user',
      confirmationMessages: {
        title: 'Verify task state',
        message: new vscode.MarkdownString(
          'Allow this tool to prompt you for the current task state and return your response to Copilot?'
        )
      }
    };
  }

  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<TaskStateVerifierInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const userProvidedTaskState = await this.promptForTaskState(_token);

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(userProvidedTaskState ?? '')
    ]);
  }

  private async promptForTaskState(
    token: vscode.CancellationToken
  ): Promise<string> {
    const panel = vscode.window.createWebviewPanel(
      'contextCaddyTaskStateVerifier',
      'Task State Verifier',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getWebviewHtml(panel.webview);

    return await new Promise<string>((resolve) => {
      let settled = false;

      const finish = (value: string): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
        panel.dispose();
      };

      const messageDisposable = panel.webview.onDidReceiveMessage(
        (message: VerifierMessage) => {
          if (message.type === 'submit') {
            finish(message.value);
            return;
          }

          finish('');
        }
      );

      const disposeDisposable = panel.onDidDispose(() => {
        if (!settled) {
          settled = true;
          resolve('');
        }
      });

      const cancellationDisposable = token.onCancellationRequested(() => {
        finish('');
      });

      panel.webview.postMessage({ type: 'focus' }).then(undefined, () => undefined);

      panel.onDidDispose(() => {
        messageDisposable.dispose();
        disposeDisposable.dispose();
        cancellationDisposable.dispose();
      });
    });
  }

  private getWebviewHtml(webview: vscode.Webview): string {
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
    <title>Task State Verifier</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
        padding: 16px;
      }
      .shell {
        max-width: 760px;
        margin: 0 auto;
      }
      h1 {
        font-size: 18px;
        margin: 0 0 8px;
      }
      p {
        margin: 0 0 12px;
        line-height: 1.5;
      }
      textarea {
        width: 100%;
        min-height: 220px;
        resize: vertical;
        box-sizing: border-box;
        padding: 12px;
        border: 1px solid var(--vscode-input-border, transparent);
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        font: inherit;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      button {
        border: 0;
        padding: 8px 14px;
        cursor: pointer;
        font: inherit;
      }
      .primary {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
      }
      .secondary {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }
      .hint {
        color: var(--vscode-descriptionForeground);
        margin-top: 12px;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <h1>Confirm the current task state</h1>
      <p>
        Enter the task state, approval, or request context you want Copilot to
        use. The submitted text will be returned unchanged to the tool caller.
      </p>
      <textarea
        id="taskState"
        placeholder="Describe or approve the current task state"
      ></textarea>
      <div class="actions">
        <button class="primary" id="submit">Submit</button>
        <button class="secondary" id="cancel">Cancel</button>
      </div>
      <p class="hint">
        This panel supports multiline input and remains available while hidden.
      </p>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const textarea = document.getElementById('taskState');
      const submit = document.getElementById('submit');
      const cancel = document.getElementById('cancel');

      const sendSubmit = () => {
        vscode.postMessage({ type: 'submit', value: textarea.value });
      };

      submit.addEventListener('click', sendSubmit);
      cancel.addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });
      textarea.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          sendSubmit();
        }
      });
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'focus') {
          textarea.focus();
        }
      });
      textarea.focus();
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
