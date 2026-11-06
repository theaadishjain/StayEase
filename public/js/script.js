(() => {
  'use strict'

  // Bootstrap form validation: block submit and show feedback for invalid forms
  document.querySelectorAll('.needs-validation').forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }
      form.classList.add('was-validated')
    }, false)
  })

  // Listings page: filter cards by title / location / country as you type
  const search = document.getElementById('listingSearch')
  const grid = document.getElementById('listingGrid')
  if (search && grid) {
    const cards = Array.from(grid.querySelectorAll('[data-search]'))
    const noResults = document.getElementById('noResults')
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase()
      let shown = 0
      cards.forEach(card => {
        const match = !q || card.dataset.search.includes(q)
        card.classList.toggle('d-none', !match)
        if (match) shown++
      })
      if (noResults) noResults.classList.toggle('d-none', shown > 0)
    })
  }

  // Listing form: live preview of the image link
  document.querySelectorAll('input[data-preview]').forEach(input => {
    const box = document.querySelector(input.dataset.preview)
    if (!box) return
    const placeholder = '<span><i class="fa-regular fa-image me-1" aria-hidden="true"></i> Photo preview</span>'
    let timer
    input.addEventListener('input', () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const url = input.value.trim()
        if (!/^https?:\/\//i.test(url)) {
          box.innerHTML = placeholder
          return
        }
        const img = new Image()
        img.alt = 'Listing photo preview'
        img.onload = () => box.replaceChildren(img)
        img.onerror = () => {
          box.innerHTML = '<span><i class="fa-solid fa-image me-1" aria-hidden="true"></i> Couldn\'t load that image</span>'
        }
        img.src = url
      }, 300)
    })
  })
})()
