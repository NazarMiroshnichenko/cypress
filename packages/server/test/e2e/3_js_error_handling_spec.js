/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs       = require("fs");
const Fixtures = require("../support/helpers/fixtures");
const e2e      = require("../support/helpers/e2e").default;

const onServer = function(app) {
  app.get("/index.html", (req, res) => res.send(`\
<html>
<body>
  some bad js a comin'
</body>
</html>\
`));

  app.get("/gzip-bad.html", function(req, res) {
    const buf = fs.readFileSync(Fixtures.path("server/gzip-bad.html.gz"));

    return res.set({
      "content-type": "text/html",
      "content-encoding": "gzip"
    })
    .send(buf);
  });

  return app.get("/gzip-bad.js", function(req, res) {
    const buf = fs.readFileSync(Fixtures.path("server/gzip-bad.html.gz"));

    return res.set({
      "content-type": "application/javascript",
      "content-encoding": "gzip"
    })
    .send(buf);
  });
};

describe("e2e js error handling", function() {
  e2e.setup({
    servers: [{
      port: 1122,
      static: true
    }, {
      port: 1123,
      onServer
    }]
  });

  return e2e.it("fails", {
    spec: "js_error_handling_failing_spec.coffee",
    snapshot: true,
    expectedExitCode: 5
  });
});
