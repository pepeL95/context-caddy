# Context Caddy

This extension currently contributes one VS Code Language Model Tool:

- `yourpublisher_taskStateVerifier`

In Copilot Chat agent mode, it can be enabled as a tool and explicitly invoked with `#taskStateVerifier`.

The tool takes no model-provided input. On invocation, it reveals and focuses the persistent Context Caddy Task State view, waits for the user to submit task-state text there, returns that submitted text unchanged, and then clears the textbox:

```text
user approved the current plan
```

## Current behavior

This implementation is intentionally minimal:

- It accepts no input from the model.
- It provides a persistent Task State view in the Context Caddy activity bar container.
- The user can edit multiline task-state text there at any time.
- During tool invocation, the extension reveals that view, focuses the textbox, and waits for `Submit`.
- After successful submission, the tool returns the exact submitted text unchanged and clears the textbox.
- The view is more durable than transient prompts because it is not tied to a popup that disappears on focus changes.
- Its description is written to make this the intended pre-response verification step for current task state and user acceptance context.
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
   code --install-extension context-caddy-0.0.1.vsix
   ```

5. Reload VS Code:

   - Run `Developer: Reload Window` from the Command Palette.

Alternative install path:

- Run `Extensions: Install from VSIX...` from the Command Palette and select `context-caddy-0.0.1.vsix`.

After installation and reload, Copilot in that same VS Code window can discover the tool.

## Use in the current window

1. Reload VS Code after installation with `Developer: Reload Window`.
2. Run `Context Caddy: Open Task State` from the Command Palette.
3. In the `Context Caddy` activity bar container, enter task-state text there directly, or wait for Copilot to focus it during verification.
4. Open Copilot Chat in Agent mode.
5. Enable `Task State Verifier` in the tools picker.
6. Use `#taskStateVerifier` when you want Copilot to focus the task-state textbox and wait for you to submit text.

## Agent setup

If an agent or teammate needs to set this up from scratch, the reliable local sequence is:

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run compile`.
4. Run `npm run package:vsix`.
5. Install `context-caddy-0.0.1.vsix` with `code --install-extension context-caddy-0.0.1.vsix` or `Extensions: Install from VSIX...`.
6. Reload the VS Code window.
7. Open Copilot Chat in Agent mode.
8. Enable `Task State Verifier` in the tools picker.
9. Open `Context Caddy: Open Task State` from the Command Palette.
10. Use `#taskStateVerifier` explicitly for the most reliable invocation path.
11. When the tool is approved, enter text in the focused Task State view and click `Submit`.

## Test in Copilot Chat

1. Open a folder workspace in either the Extension Development Host or your normal VS Code window after VSIX installation.
2. Open Copilot Chat and switch to Agent mode.
3. Enable the tool in the tools picker.
4. Open `Context Caddy: Open Task State` once so the view is visible.
5. Try one of these prompts:

   ```text
   Call #taskStateVerifier before responding.
   ```

   ```text
   Before you answer, use #taskStateVerifier so the user can confirm the current task state.
   ```

## Limitations

- Extension tools show a confirmation dialog before invocation. Users can allow the tool per invocation or choose an always-allow option.
- The tool depends on the user submitting text from the persistent Task State view after approval.
- If the tool is cancelled or the view is closed before submission, it returns an empty string.
- The current VS Code extension tool API does not provide a way to force Copilot to always invoke this tool before every response, even if the tool description marks it as mandatory.

## Next upgrade path

If you want stronger control later, the next step is to combine this with a chat participant or a more opinionated tool contract so your own extension logic, rather than the base Copilot agent alone, decides when the tool must run.
