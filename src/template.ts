import type { Redirect } from './types'

export default ({
  baseUrl,
  redirects,
}: {
  baseUrl: string
  redirects: Redirect[]
}) => () => `
<!doctype html>
<html>
  <head>
    <title>Lil Redirector</title>
    <link href="https://unpkg.com/tailwindcss@^1.0/dist/tailwind.min.css" rel="stylesheet">
    <style>
      .bg-gray-50 {
        background-color: #f9fafb;
        background-color: rgba(249,250,251,1);
      }

      .form-input {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-color: #fff;
        border-color: #d2d6dc;
        border-width: 1px;
        border-radius: .375rem;
        padding: .5rem .75rem;
        font-size: 1rem;
        line-height: 1.5;
      }

      .form-textarea {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-color: #fff;
        border-color: #d2d6dc;
        border-width: 1px;
        border-radius: .375rem;
        padding: .5rem .75rem;
        font-size: 1rem;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <ul class="flex items-center px-4 py-2">
      <div class="flex-1 flex items-center">
        <img class="w-16 h-16 mr-2" src="https://raw.githubusercontent.com/signalnerve/lilredirector/master/.github/logo.png" />
        <h1 class="text-2xl font-bold">Lil Redirector</h1>
      </div>
      <span><code>v0.5.1</code></span>
    </ul>

    <div class="py-6">
      <header class="mb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="mt-2 md:flex md:items-center md:justify-between">
            <div class="flex-1 min-w-0">
              <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9 sm:truncate">
                Redirects (${redirects.length})
              </h2>
            </div>
            <div class="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
              <span class="shadow-sm rounded-md">
                <button id="add_redirect_button" type="button" class="inline-flex items-center px-4 py-2 border border-transparent leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:shadow-outline-indigo focus:border-indigo-700 active:bg-indigo-700 transition duration-150 ease-in-out">
                  + Create Redirect
                </button>
              </span>
              <a class="ml-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center" id="export" href="#" class="float-right">
                <svg class="fill-current w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z"/></svg>
                <span>Export CSV</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div class="rounded-md bg-red-100 my-4 p-4" id="flash">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm leading-5 font-medium text-red-800" id="flash_text"></h3>
              </div>
            </div>
          </div>

          <div class="hidden bg-gray-50 overflow-hidden rounded-lg mb-8" id="add_redirect">
            <form class="px-4 py-5 sm:p-6 w-1/2" action="${baseUrl}/update" method="post">
              <div class="sm:col-span-3">
                <label for="path" class="block font-medium leading-5 text-gray-700">Path</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                  <input id="path" name="path" class="form-input block w-full sm:text-sm sm:leading-5" placeholder="/about">
                </div>
                <p class="mt-2 text-gray-700" id="path-description">Path must be local (e.g. "/about") and should not have any trailing slashes</p>
              </div>

              <div class="sm:col-span-3 mt-4">
                <label for="redirect" class="block font-medium leading-5 text-gray-700">Redirect</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                  <input id="redirect" name="redirect" class="form-input block w-full sm:text-sm sm:leading-5" placeholder="/about-us">
                </div>
                <p class="mt-2 text-gray-700" id="redirect-description">Redirects can be relative (e.g. "/about-us") or absolute ("https://twitter.com/cloudflaredev")</p>
              </div>

              <details class="sm:col-span-3 mt-4">
                <summary class="text-gray-700">Add Multiple Redirects</summary>
                <div class="mt-4">
                  <label for="bulk" class="block font-medium leading-5 text-gray-700">Bulk Redirects</label>
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <textarea id="bulk" name="bulk" rows="3" class="form-textarea block w-full transition duration-150 ease-in-out sm:text-sm sm:leading-5"></textarea>
                  </div>
                  <p class="mt-2 text-gray-700" id="bulk-description">Redirects should be in CSV format, e.g. "path,redirect_url"</p>
                </div>
              </details>

              <div class="mt-4">
                <button class="mr-4 inline-flex items-center px-4 py-2 border border-transparent leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150" type="submit">Save</button>
                <span class="inline-flex rounded-md shadow-sm">
                  <button id="close_form" type="button" class="inline-flex items-center px-4 py-2 border border-gray-300 leading-5 font-medium rounded-md text-gray-700 bg-white hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:text-gray-800 active:bg-gray-50 transition ease-in-out duration-150">
                    Cancel
                  </button>
                </span>
              </div>
            </form>
          </div>

          <section>
            ${redirects.length
    ? `
            <table class="table-auto">
              <thead>
                <tr>
                  <th class="px-4 py-2">Path</th>
                  <th class="px-4 py-2">Redirect</th>
                  <th class="px-4 py-2">Visits*</th>
                  <th class="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${redirects
      .filter((redirect: Redirect) => !!redirect.path)
      .map(
        (redirect: Redirect) => `
                  <tr>
                    <td class="border px-4 py-2">${redirect.path}</td>
                    <td class="border px-4 py-2">${redirect.redirect}</td>
                    <td class="border px-4 py-2">${redirect.visits}</td>
                    <td class="border px-4 py-2">
                      <button class="hover:underline text-gray-800 font-semibold" data-target="${redirect.path}" id="edit">Edit</button>
                      <button class="hover:underline text-red-800 font-semibold ml-4" data-target="${redirect.path}" id="delete">Delete</button>
                    </td>
                  </tr>
                `,
      )
      .join('\n')}
              </tbody>
            </table>
            <p class="mt-4 text-gray-800">* Visits are an estimate. Distributed systems!</p>
            `
    : `<p>No redirects created yet!</p>`
  }
          </section>
        </div>
      </main>
    </div>

    <script id="redirects_data" type="text/json">${JSON.stringify(
    redirects,
  )}</script>

    <script>
      const url = new URL(document.location)
      const flash = document.querySelector("#flash")
      const pathInput = document.querySelector("input#path")
      const redirectInput = document.querySelector("input#redirect")
      const bulkInput = document.querySelector('textarea#bulk')
      const exportButton = document.querySelector("a#export")

      const redirects = JSON.parse(document.querySelector("script#redirects_data").innerText)

      exportButton.addEventListener("click", exportToCsv)

      const exportToCsv = ({ target }) => {
        let csvStr = ""
        redirects.forEach(({ path, redirect }) => {
          csvStr += [path, redirect].join(",")
          csvStr += "\n"
        })
        const file = new Blob([csvStr], { type: "text/csv" })
        const fileUrl = URL.createObjectURL(file)
        exportButton.download = "export.csv"
        exportButton.href = fileUrl
        exportButton.click()
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }

      flash.hidden = true
      const parseErrors = () => {
        const errorMsg = url.searchParams.get("error")
        if (errorMsg && errorMsg.length) {
          document.querySelector("#flash_text").innerText = errorMsg
          flash.hidden = false
        }
      }
      parseErrors()

      const confirmDeletion = async redirectId => {
        let url = new URL(window.location)
        url.pathname = "${baseUrl}/delete"
        url.searchParams.set("path", redirectId)
        await window.fetch(url, {
          method: "DELETE"
        })
        window.location.reload()
      }

      const deleteRedirect = evt => {
        const button = evt.target
        const redirectId = button.dataset.target
        const redirect = redirects.find(({ path }) => path === redirectId)
        if (window.confirm("are you sure you want to delete the redirect for " + redirect.path + "?")) {
          confirmDeletion(redirectId)
        }
      }

      const editRedirect = evt => {
        const button = evt.target
        const redirectId = button.dataset.target
        const redirect = redirects.find(({ path }) => path === redirectId)

        pathInput.value = redirect.path
        redirectInput.value = redirect.redirect
        document.querySelector("#add_redirect").classList.remove("hidden")
      }

      document.querySelectorAll('button#edit').forEach(button => button.addEventListener('click', editRedirect))
      document.querySelectorAll('button#delete').forEach(button => button.addEventListener('click', deleteRedirect))

      const validateForm = event => {
        let valid = true

        if (pathInput.value.length || redirectInput.value.length) {
          if (bulkInput.value.length) {
            alert("Can't fill out bulk field and individual redirect")
            valid = false
          }

          if (!pathInput.value.length) {
            valid = false
            pathInput.classList.add("error")
          }

          if (!redirectInput.value.length) {
            valid = false
            redirectInput.classList.add("error")
          }
        }

        if (!pathInput.value.length && !redirectInput.value.length && !bulkInput.value.length) {
          document.querySelector("#flash_text").innerText = "No redirects provided"
          flash.hidden = false
          valid = false
        }

        if (!valid) {
          event.preventDefault()
        }
      }

      document.querySelector("form").addEventListener('submit', validateForm)

      const toggleForm = () => document.querySelector("#add_redirect").classList.toggle("hidden")
      document.querySelector("#add_redirect_button").addEventListener('click', toggleForm)
      document.querySelector("#close_form").addEventListener('click', toggleForm)
    </script>
  </body>
</html>
`
