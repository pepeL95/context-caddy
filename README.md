# Context Caddy

This extension currently contributes one VS Code Language Model Tool:

- `yourpublisher_taskStateVerifier`

In Copilot Chat agent mode, it can be enabled as a tool and explicitly invoked with `#taskStateVerifier`.

The tool takes no model-provided input. When invoked, it opens a dedicated multiline verification panel for the user and returns the submitted text unchanged:

```text
user approved the current plan
```

## Current behavior

This implementation is intentionally minimal:

- It accepts no input from the model.
- It opens a dedicated webview panel with a multiline textarea for the user to confirm or restate the current task state.
- It returns the exact user-provided text unchanged.
- If the user cancels or closes the panel, it returns an empty string.
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
9. Use `#taskStateVerifier` explicitly for the most reliable invocation path.

## Test in Copilot Chat

1. Open a folder workspace in either the Extension Development Host or your normal VS Code window after VSIX installation.
2. Open Copilot Chat and switch to Agent mode.
3. Enable the tool in the tools picker.
4. Try one of these prompts:

   ```text
   Call #taskStateVerifier before responding.
   ```

   ```text
   Before you answer, use #taskStateVerifier so the user can confirm the current task state.
   ```

## Limitations

- Extension tools show a confirmation dialog before invocation. Users can allow the tool per invocation or choose an always-allow option.
- The tool relies on the user completing the verification panel when it is invoked.
- The current VS Code extension tool API does not provide a way to force Copilot to always invoke this tool before every response, even if the tool description marks it as mandatory.

## Next upgrade path

If you want stronger control later, the next step is to combine this with a chat participant or a more opinionated tool contract so your own extension logic, rather than the base Copilot agent alone, decides when the tool must run.
