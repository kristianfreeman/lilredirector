const style = `
  html {
    -webkit-font-smoothing: antialiased;
    font-family: "Helvetica Neue", helvetica, "Apple Color Emoji", arial, sans-serif;
    color: #1d2d35;
    background: #fff;
  }

  body {
    margin: 0 auto;
    max-width: 64rem;
  }

  section {
    margin: 2rem 0;
    border-top: 1px solid #767676;
  }

  h1, h2 {
    margin-top: 1em;
    margin-bottom: 0;
  }

  table {
    width: 100%;
    margin: 1em 0;
  }

  div {
    margin: 1rem 0;
  }

  label {
    font-weight: bold;
  }

  td {
    padding: .5rem 0;
  }

  th {
    text-align: left;
  }

  tr > *:last-child,
  tr > *:nth-last-child(2) {
    text-align: right;
  }

  #flash {
    background: #FFF5F5;
    color: #e53e3e;
    font-weight: 600;
    padding: 1rem;
  }

  .error {
    background: #FFF5F5;
  }
`

export default ({ redirects }) => () => `
<!doctype html>
<html>
  <head>
    <title>lil redirector is tracking ${redirects.length} redirects</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css" integrity="sha512-NhSC1YmyruXifcj/KFRWoC561YpHpc5Jtzgvbuzx5VozKpWvQ+4nXhPdFgmx8xqexRcpAglTj9sIBWINXa8x5w==" crossorigin="anonymous" />
    <style>${style}</style>
  </head>
  <body>
    <h1>lil redirector</h1>
    <p>helping you with ${redirects.length} redirects</p>

    <p id="flash"></p>

    <section>
      <h2>create a redirect</h2>
      <form action="/_redirects/update">
        <div>
          <label for="path">path</label><br /><br />
          <input type="text" id="path" name="path" placeholder="/about"></input>
          <p><small>path must be local (e.g. "/about") and should not have any trailing slashes</small></p>
        </div>

        <div>
          <label for="redirect">redirect</label><br /><br />
          <input type="text" id="redirect" name="redirect" placeholder="/about-us"></input>
          <p><small>redirects can be relative (e.g. "/about-us") or absolute ("https://twitter.com/cloudflaredev")</small></p>
        </div>

        <details>
          <summary>add multiple redirects</summary>
          <div>
            <label for="bulk">bulk redirects</label><br /><br />
            <textarea cols=64 rows=8 id="bulk" name="bulk" placeholder="/twitter,https://twitter.com/signalnerve"></textarea>
            <p><small>redirects should be in csv format, e.g. "path,redirect_url"</small></p>
          </div>
        </details>

        <div>
          <button type="submit">create redirect</button>
        <div>
      </form>
    </section>

    <section>
      <h2>redirects</h2>
      ${
        redirects.length
          ? `
      <table>
        <tr>
          <th>path</th>
          <th>redirect</th>
          <th>visits*</th>
          <th>actions</th>
        </tr>
        ${redirects
          .map(
            redirect => `
          <tr>
            <td>${redirect.path}</td>
            <td>${redirect.redirect}</td>
            <td>${redirect.visits}</td>
            <td>
              <button data-target="${redirect.path}" id="edit">edit</button>
              <button data-target="${redirect.path}" id="delete">delete</button>
            </td>
          </tr>
        `,
          )
          .join('\n')}
      </table>
      <p>* visits are an estimate. distributed systems!</p>
      `
          : `<p>no redirects created yet!</p>`
      }
    </section>

    <code>version 0.2.0</code>

    <script id="redirects_data" type="text/json">${JSON.stringify(
      redirects,
    )}</script>

    <script>
      const url = new URL(document.location)
      const flash = document.querySelector("#flash")
      const pathInput = document.querySelector("input#path")
      const redirectInput = document.querySelector("input#redirect")
      const bulkInput = document.querySelector('textarea#bulk')

      const redirects = JSON.parse(document.querySelector("script#redirects_data").innerText)

      flash.hidden = true
      const parseErrors = () => {
        const errorMsg = url.searchParams.get("error")
        if (errorMsg && errorMsg.length) {
          flash.innerHTML = errorMsg
          flash.hidden = false
        }
      }
      parseErrors()

      const confirmDeletion = async redirectId => {
        let url = new URL(window.location)
        url.pathname = "/_redirects/delete"
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
          flash.innerText = "No redirects provided"
          flash.hidden = false
          valid = false
        }

        if (!valid) {
          event.preventDefault()
        }
      }

      document.querySelector("form").addEventListener('submit', validateForm)
    </script>
  </body>
</html>
`
