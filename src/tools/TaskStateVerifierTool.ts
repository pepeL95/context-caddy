import * as vscode from 'vscode';

type TaskStateVerifierInput = Record<string, never>;

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
    const userProvidedTaskState = await vscode.window.showInputBox({
      title: 'Task State Verifier',
      prompt: 'Confirm the current task state for Copilot',
      placeHolder: 'Describe or approve the current task state'
    });

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(userProvidedTaskState ?? '')
    ]);
  }
}
