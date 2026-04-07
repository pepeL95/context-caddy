import * as vscode from 'vscode';
import {
  TASK_STATE_VIEW_ID,
  TaskStateVerifierTool,
  TaskStateViewProvider
} from './tools/TaskStateVerifierTool';

export function activate(context: vscode.ExtensionContext): void {
  const taskStateViewProvider = new TaskStateViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TASK_STATE_VIEW_ID,
      taskStateViewProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('contextCaddy.openTaskStateView', async () => {
      await vscode.commands.executeCommand(
        'workbench.view.extension.contextCaddy'
      );
      await vscode.commands.executeCommand(`${TASK_STATE_VIEW_ID}.focus`);
    })
  );

  context.subscriptions.push(
    vscode.lm.registerTool(
      'yourpublisher_taskStateVerifier',
      new TaskStateVerifierTool(taskStateViewProvider)
    )
  );
}

export function deactivate(): void {}
