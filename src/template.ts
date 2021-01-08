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
    </style>
  </head>
  <body>
    <ul class="flex items-center px-4 py-2">
      <div class="flex-1 flex items-center">
        <img class="w-16 h-16 mr-2" src="https://raw.githubusercontent.com/signalnerve/lilredirector/master/.github/logo.png" />
        <h1 class="text-2xl font-bold">Lil Redirector</h1>
      </div>
      <span><code>v1.0.1</code></span>
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
          </div>
        </div>
      </header>

      <main>
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <section>
            ${redirects.length
    ? `
            <table class="table-auto">
              <thead>
                <tr>
                  <th class="px-4 py-2">Path</th>
                  <th class="px-4 py-2">Redirect</th>
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
                  </tr>
                `,
      )
      .join('\n')}
              </tbody>
            </table>
            `
    : `<p>No redirects created yet!</p>`
  }
          </section>
        </div>
      </main>
    </div>
  </body>
</html>
`
