import * as vscode from 'vscode';
import { TaskStateVerifierTool } from './tools/TaskStateVerifierTool';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.lm.registerTool(
      'yourpublisher_taskStateVerifier',
      new TaskStateVerifierTool()
    )
  );
}

export function deactivate(): void {}
