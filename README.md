# Context Caddy

This extension currently contributes one VS Code Language Model Tool:

- `yourpublisher_taskStateVerifier`

In Copilot Chat agent mode, it can be enabled as a tool and explicitly invoked with `#taskStateVerifier`.

The tool takes no model-provided input. When invoked, it prompts the user for task-state text and returns that text unchanged:

```text
user approved the current plan
```

## Current behavior

This implementation is intentionally minimal:

- It accepts no input from the model.
- It opens an input box for the user to confirm or restate the current task state.
- It returns the exact user-provided text unchanged.
- If the user cancels the prompt, it returns an empty string.
- Its description is written to make this the intended pre-response verification step for current task state and user acceptance context.
- The extension API still does not guarantee invocation before every response.

## Run locally

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

## Test in Copilot Chat

1. Open a folder workspace in the Extension Development Host.
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
- The tool relies on the user completing the input box when it is invoked.
- The current VS Code extension tool API does not provide a way to force Copilot to always invoke this tool before every response, even if the tool description marks it as mandatory.

## Next upgrade path

If you want stronger control later, the next step is to combine this with a chat participant or a more opinionated tool contract so your own extension logic, rather than the base Copilot agent alone, decides when the tool must run.
