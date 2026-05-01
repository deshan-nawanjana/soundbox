// get snippet elements
const snippets = document.querySelectorAll("[data-code]")

// for each snippet
for (let i = 0; i < snippets.length; i++) {
  // get element by index
  const element = snippets[i]
  // get highlighted content
  const content = Prism.highlight(element.innerText, Prism.languages.html, "html")
  // replace content in snippet
  element.innerHTML = content
}
