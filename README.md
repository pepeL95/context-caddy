# Compliance Guardrail

This extension currently contributes one VS Code Language Model Tool:

- `local_complianceGuardrail`

In Copilot Chat agent mode, it can be enabled as a tool and explicitly invoked with `#complianceGuardrail`.

The tool takes no model-provided input. On invocation, it reveals and focuses the persistent Compliance Guardrail Instructions view, waits for the user to submit final instructions there, returns those instructions unchanged, and then clears the textbox:

```text
Only use approved sources, and do not conclude until I approve the final answer.
```

## Current behavior

This implementation is intentionally minimal:

- It accepts no input from the model.
- It provides a persistent Instructions view in the Compliance Guardrail activity bar container.
- The user can enter multiline final instructions for the agent there.
- During tool invocation, the extension reveals that view, focuses the textbox, and waits for `Submit`.
- After successful submission, the tool returns the exact submitted instructions unchanged and clears the textbox.
- The view is more durable than transient prompts because it is not tied to a popup that disappears on focus changes.
- Its description is written to make this the mandatory final guardrail step before any user-facing response is yielded.
- The extension API still does not guarantee invocation before every response.

## Development host

1. Install dependencies:

   ```bash
   npm install
   ```

2. Compile the extension:

   ```bash
   npm run compile
   ```

3. Press `F5` in VS Code to launch an Extension Development Host.

If you see `Cannot find module 'vscode'`, you are likely running `out/extension.js` directly with Node instead of launching the `Run Extension` debug configuration. Extension code must run inside VS Code's extension host.

## Install in your current VS Code window

If you want the extension available in the VS Code window you are already using, package and install it as a `.vsix` instead of using the Extension Development Host.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Compile the extension:

   ```bash
   npm run compile
   ```

3. Package the extension:

   ```bash
   npm run package:vsix
   ```

4. Install the generated `.vsix` in your current VS Code:

   ```bash
   code --install-extension compliance-guardrail-0.0.1.vsix
   ```

5. Reload VS Code:

   - Run `Developer: Reload Window` from the Command Palette.

Alternative install path:

- Run `Extensions: Install from VSIX...` from the Command Palette and select `compliance-guardrail-0.0.1.vsix`.

After installation and reload, Copilot in that same VS Code window can discover the tool.

If you previously installed the older `Context Caddy` build, remove it to avoid tool-picker ambiguity:

```bash
code --uninstall-extension yourpublisher.context-caddy
```

## Use in the current window

1. Reload VS Code after installation with `Developer: Reload Window`.
2. Run `Compliance Guardrail: Open Instructions` from the Command Palette.
3. In the `Compliance Guardrail` activity bar container, enter instructions there directly, or wait for Copilot to focus it during verification.
4. Open Copilot Chat in Agent mode.
5. Enable `Compliance Guardrail` in the tools picker.
6. Use `#complianceGuardrail` when you want Copilot to focus the instructions textbox and wait for you to submit text.

## Agent setup

If an agent or teammate needs to set this up from scratch, the reliable local sequence is:

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run compile`.
4. Run `npm run package:vsix`.
5. Install `compliance-guardrail-0.0.1.vsix` with `code --install-extension compliance-guardrail-0.0.1.vsix` or `Extensions: Install from VSIX...`.
6. Reload the VS Code window.
7. Open Copilot Chat in Agent mode.
8. Enable `Compliance Guardrail` in the tools picker.
9. Open `Compliance Guardrail: Open Instructions` from the Command Palette.
10. Use `#complianceGuardrail` explicitly for the most reliable invocation path.
11. When the tool is approved, enter instructions in the focused Instructions view and click `Submit`.

## Test in Copilot Chat

1. Open a folder workspace in either the Extension Development Host or your normal VS Code window after VSIX installation.
2. Open Copilot Chat and switch to Agent mode.
3. Enable the tool in the tools picker.
4. Open `Compliance Guardrail: Open Instructions` once so the view is visible.
5. Try one of these prompts:

   ```text
   Call #complianceGuardrail before responding.
   ```

   ```text
   Before you answer, use #complianceGuardrail so the user can provide final instructions.
   ```

## Limitations

- Extension tools show a confirmation dialog before invocation. Users can allow the tool per invocation or choose an always-allow option.
- The tool depends on the user submitting text from the persistent Instructions view after approval.
- If the tool is cancelled or the view is closed before submission, it returns an empty string.
- The strongest intended workflow is: synthesize the result, call `#complianceGuardrail`, apply any returned instruction, and only then yield.
- The current VS Code extension tool API does not provide a way to force Copilot to always invoke this tool before every response, even if the tool description marks it as mandatory.

## Packaging Note

- On Node 18, VSIX packaging depends on the pinned `@vscode/vsce` version and the `cheerio` override in `package.json`. Keep those in place unless you also upgrade the local Node runtime and re-verify packaging.

## Next upgrade path

If you want stronger control later, the next step is to combine this with a chat participant or a more opinionated tool contract so your own extension logic, rather than the base Copilot agent alone, decides when the tool must run.
