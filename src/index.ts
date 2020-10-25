import type { PlaygroundPlugin, PluginUtils } from "./vendor/playground"

const makePlugin = (utils: PluginUtils) => {
  let codeblocks = [] as Array<{ code: string, prefix: string, type: string }>
  let selectedIndex = -1
  let next = () => {}

  const style = document.styleSheets[0];
  style.insertRule(`.playground-plugin-container pre.clickable { border: 1px solid transparent !important; width: auto !important; }`, style.cssRules.length);
  style.insertRule(`.playground-plugin-container pre.selected { border: 1px solid grey !important;  }`, style.cssRules.length);
  style.insertRule(`.playground-plugin-container pre.clickable:hover { border: 1px solid black !important; cursor: pointer; }`, style.cssRules.length);
  style.insertRule(`.playground-plugin-container sub { background-color: var(--playground-pre-bg); font-weight: bold; padding: 0px 10px; margin-bottom: -3px; position: relative; bottom: -1px; }`, style.cssRules.length);
 
  const customPlugin: PlaygroundPlugin = {
    id: "code-samples",
    displayName: "MD Blocks",
    didMount: (sandbox, container) => {

      // This is changed later once all the vars are set up
      sandbox.editor.addAction({
        id: "next-sample",
        label: "Run the next sample",
        keybindings: [sandbox.monaco.KeyMod.CtrlCmd | sandbox.monaco.KeyCode.KEY_G],
  
        contextMenuGroupId: "run",
        contextMenuOrder: 1.5,
  
        run: function (ed) {
          next()
        },
      })
    
      const render = () => {
        const ds = utils.createDesignSystem(container)
        ds.clear()
        if (codeblocks.length) {
          ds.title("Code Samples")

          // Show the codeblocks
          for (const block of codeblocks) {
            let prefix = block.prefix.slice(0, 50)
            if (prefix.length === 50) prefix += "..."
            ds.p(prefix)

            const lang = document.createElement("sub")
            lang.textContent = block.type
            lang.classList.add("title")
            container.appendChild(lang)

            const codeblock = ds.code(block.code)
            codeblock.textContent = block.code
            const pre = codeblock.parentElement

            pre.classList.add("clickable")
            pre.setAttribute("index", String(codeblocks.indexOf(block)))
            pre.setAttribute("lang", block.type)

            next = () => {
              select(selectedIndex + 1)
            }

            // Handle selection by indexes so that cmd + g can work
            const select = (index: number, suppressScroll?: true) => {
              selectedIndex = index
              
              const codeblockElem = document.querySelector(`pre.clickable[index='${index}']`) as HTMLElement
              if (!codeblockElem) return

              document.querySelectorAll(".playground-plugin-container pre.clickable").forEach(e => e.classList.remove("selected"))

              codeblockElem.classList.add("selected")
              sandbox.setText(codeblockElem.textContent)

              if (!suppressScroll) {
                const sidebar = document.querySelector(`.playground-plugin-container`)
                sidebar.scroll({ top: codeblockElem.offsetTop - 90 })
              }

              const isTS = codeblockElem.getAttribute("lang").startsWith("ts")
              sandbox.languageServiceDefaults.setDiagnosticsOptions({ noSemanticValidation: !isTS, noSyntaxValidation: !isTS })
            }

            codeblock.parentElement.onclick = () => {
              const index = codeblocks.indexOf(block)
              select(index, true)
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
      
      if (selectedIndex !== -1) {
        selectedIndex -= 1
        next()
      }
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
  const results = [] as Array<{ code: string, type:string, prefix: string}>
  let lastLineStart = ""
  let codeState = ""
  let lastType = ""
  let state: ParseState = ParseState.Text

  for (const line of lines) {
    const isFence = line.trim().startsWith("```")
    if (isFence) {
      // Start of code block
      if (state === ParseState.Text) {
        lastType = line.split("```")[1].split(" ")[0]
        state = ParseState.Code
      } else {
        // End of code block
        state = ParseState.Text
        results.push({ code: codeState, prefix: lastLineStart, type: lastType })
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
