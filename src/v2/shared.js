// Shared by both pages of staging v2: the faces, the styles, and how one item on the shelf is drawn.
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource/instrument-serif/400-italic.css'
import './site.css'
import list from './items.json'

export const items = list
export const KIND = { template: 'Website template', scene: '360 scene', art: 'Art', graphic: 'Graphic' }
export const SHORT = { template: 'Template', scene: '360', art: 'Art', graphic: 'Graphic' }
export const img = id => `/v2/img/${id}.jpg`
export const byId = id => items.find(i => i.id === id)

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** One item as a card: a link on the home page, a button on the catalog page. */
export function itemCard(it, tag = 'a') {
  const open = tag === 'a' ? `<a class="card item" href="/staging-v2/catalog/?i=${it.id}">` : `<button class="card item" type="button" data-id="${it.id}">`
  return `${open}<div class="pic"><img src="${img(it.id)}" alt="" loading="lazy" width="800" height="500"><span class="badge">${SHORT[it.kind]}</span>${it.ai ? '<span class="badge ai">AI</span>' : ''}</div><h3>${esc(it.title)}</h3><small>${KIND[it.kind]}${it.pages ? `, ${it.pages} pages` : ''}</small></${tag}>`
}
