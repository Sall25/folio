import jsonServer from "json-server";

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Single-row comment delete — bypasses json-server's default DELETE handler,
// which was wiping the whole comments collection on this db.
server.delete("/comments/:id", (req, res) => {
  const removed = router.db
    .get("comments")
    .remove({ id: req.params.id })
    .write();
  res.status(200).jsonp(removed[0] ?? {});
});

// Single-row thread delete — comments are deleted separately by the hook
server.delete("/threads/:id", (req, res) => {
  const removed = router.db
    .get("threads")
    .remove({ id: req.params.id })
    .write();
  res.status(200).jsonp(removed[0] ?? {});
});

server.use(router);

server.listen(3001, () => {
  console.log("JSON Server running on http://localhost:3001");
});
