// Rebuilds content/ from the almirah vault. Only notes with `publish: true` are copied.
import fs from "node:fs"
import path from "node:path"

const repo = path.resolve(import.meta.dirname, "..")
const vault = ["/Users/casegoods01/Documents/almirah", "/Users/PREDATOR/Documents/almirah"].find((p) =>
  fs.existsSync(path.join(p, "Notes")),
)
if (!vault) throw new Error("Could not find the almirah vault.")

const SOURCE_FOLDERS = ["Notes", "References"]
const KEEP_KEYS = new Set(["title", "date", "aliases", "tags"])
const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i

const splitNote = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n?---\n?/)
  return m ? [m[1], text.slice(m[0].length)] : ["", text]
}

// Top-level frontmatter blocks, so a key's list items travel with it.
const blocks = (fm) => {
  const out = []
  for (const line of fm.split("\n")) {
    if (/^\S/.test(line)) out.push({ key: line.split(":")[0], lines: [line] })
    else out.at(-1)?.lines.push(line)
  }
  return out
}

const published = []
for (const folder of SOURCE_FOLDERS) {
  for (const file of fs.readdirSync(path.join(vault, folder))) {
    if (!file.endsWith(".md")) continue
    const text = fs.readFileSync(path.join(vault, folder, file), "utf8")
    const [fm, body] = splitNote(text)
    if (/^publish:\s*true\s*$/m.test(fm)) published.push({ file, fm, body })
  }
}
if (published.length === 0) throw new Error("No notes marked publish: true. Leaving content/ untouched.")

const names = new Set(published.map((n) => n.file.slice(0, -3).toLowerCase()))
const images = new Set()
const isPublished = (target) => names.has(target.split("#")[0].trim().toLowerCase())

const convertLinks = (text) =>
  text
    .replace(/(!?)\[\[([^\]]+)\]\]/g, (whole, bang, inner) => {
      const [target, alias] = inner.split("|")
      if (bang) {
        if (!IMAGE.test(target)) return ""
        images.add(target.trim())
        return whole
      }
      return isPublished(target) ? whole : (alias ?? target.split("#")[0]).trim()
    })
    // Markdown links that point inside the vault become plain text.
    .replace(/(?<!!)\[([^\]]+)\]\((?!https?:|mailto:|#)[^)]*\)/g, "$1")

const cleanBody = (body) => {
  const lines = []
  let quoteDraft = false
  for (const line of body.split("\n")) {
    if (/^##\s+related\s*$/i.test(line)) break
    if (/^_\[your note:/.test(line)) continue
    if (/^> \*\*populate suggestion/.test(line)) {
      quoteDraft = true
      continue
    }
    if (quoteDraft && line.startsWith(">")) continue
    quoteDraft = false
    if (/^see also:/i.test(line)) {
      const kept = [...line.matchAll(/\[\[([^\]]+)\]\]/g)].filter((m) => isPublished(m[1].split("|")[0]))
      if (kept.length) lines.push(`see also: ${kept.map((m) => m[0]).join(", ")}`)
      continue
    }
    lines.push(line)
  }
  return convertLinks(lines.join("\n")).replace(/\n{3,}/g, "\n\n").trim() + "\n"
}

const contentDir = path.join(repo, "content")
fs.rmSync(contentDir, { recursive: true, force: true })
fs.mkdirSync(contentDir)
fs.copyFileSync(path.join(repo, "site-home.md"), path.join(contentDir, "index.md"))

for (const { file, fm, body } of published) {
  const kept = blocks(fm)
    .filter((b) => KEEP_KEYS.has(b.key) && !b.lines.join("\n").includes("Keep/"))
    .flatMap((b) => b.lines)
  const head = kept.length ? `---\n${kept.join("\n")}\n---\n` : ""
  fs.writeFileSync(path.join(contentDir, file), head + cleanBody(body))
}

for (const image of images) {
  const source = path.join(vault, "Attachments", image)
  if (!fs.existsSync(source)) {
    console.warn(`Missing image: ${image}`)
    continue
  }
  fs.mkdirSync(path.join(contentDir, "Images"), { recursive: true })
  fs.copyFileSync(source, path.join(contentDir, "Images", image))
}

console.log(`Published ${published.length} notes and ${images.size} images:`)
for (const n of published.map((n) => n.file).sort()) console.log(`  ${n}`)
