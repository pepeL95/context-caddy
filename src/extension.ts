import * as vscode from 'vscode';
import {
  HandoffInstructionsTool,
  InstructionsViewProvider,
  INSTRUCTIONS_VIEW_ID
} from './tools/TaskStateVerifierTool';

export function activate(context: vscode.ExtensionContext): void {
  const instructionsViewProvider = new InstructionsViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      INSTRUCTIONS_VIEW_ID,
      instructionsViewProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('complianceGuardrail.openInstructionsView', async () => {
      await vscode.commands.executeCommand(
        'workbench.view.extension.complianceGuardrail'
      );
      await vscode.commands.executeCommand(`${INSTRUCTIONS_VIEW_ID}.focus`);
    })
  );

  context.subscriptions.push(
    vscode.lm.registerTool(
      'local_complianceGuardrail',
      new HandoffInstructionsTool(instructionsViewProvider)
    )
  );
}

export function deactivate(): void {}
