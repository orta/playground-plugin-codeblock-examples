import type { PlaygroundPlugin, PluginUtils } from "./vendor/playground"

const makePlugin = (utils: PluginUtils) => {
  let codeblocks = [] as Array<{ code: string, prefix: string}>

  const style = document.styleSheets[0];    
  style.insertRule(`.playground-plugin-container pre.clickable { border: 1px solid transparent !important;  }`, style.cssRules.length);
  style.insertRule(`.playground-plugin-container pre.clickable:hover { border: 1px solid black !important; cursor: pointer; }`, style.cssRules.length);

  const customPlugin: PlaygroundPlugin = {
    id: "code-samples",
    displayName: "MD Blocks",
    didMount: (sandbox, container) => {
      const render = () => {
        const ds = utils.createDesignSystem(container)
        ds.clear()
        if (codeblocks.length) {
          ds.title("TS Code Samples")

          // Show the codeblocks
          for (const block of codeblocks) {
            let prefix = block.prefix.slice(0, 30)
            if (prefix.length === 30) prefix += "..."
            ds.p(prefix)

            const codeblock = ds.code(block.code)
            codeblock.parentElement.classList.add("clickable")

            codeblock.parentElement.onclick = () => {
              sandbox.setText(block.code)
            }
          }

          ds.button({ label: "Reset", onclick: () => {
            codeblocks = []
            render()
          } })

        } else {

          // Show an intro
          ds.title("Paste your markdown")
          ds.subtitle("Markdown below will be converted into a set of clickable examples")
    
          const startButton = document.createElement("textarea")
          startButton.style.boxSizing = "border-box"
          startButton.style.webkitBoxSizing = "border-box"
          startButton.style.width = "100%"
          startButton.rows = 16
          container.appendChild(startButton)
  
          ds.button({ label: "Parse Markdown", onclick: () => {
            const code = startButton.value
            codeblocks = miniMDParser(code)
            render()
          } })
        }
      }

      render()
    },
  }

  return customPlugin
}

enum ParseState {
  Text,
  Code
}

const miniMDParser = (code: string) => {
  const lines = code.split("\n")
  const results = [] as Array<{ code: string, prefix: string}>
  let lastLineStart = ""
  let codeState = ""
  let state: ParseState = ParseState.Text

  for (const line of lines) {
    const isFence = line.trim().startsWith("```")
    if (isFence) {
      // Start of code block
      if (state === ParseState.Text) {
        if (line.trim().startsWith("```ts")) state = ParseState.Code
      } else {
        // End of code block
        state = ParseState.Text
        results.push({ code: codeState, prefix: lastLineStart })
        codeState = ""
      }

    } else {
      if (state === ParseState.Code) {
        codeState += line + "\n"
      } else  {
        if(line.trim().length > 1)
        lastLineStart = line
      }
    }
  }

  return results
}

export default makePlugin
