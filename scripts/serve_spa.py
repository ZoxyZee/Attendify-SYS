from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SpaRequestHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        requested_path = Path(self.translate_path(self.path))
        if not requested_path.exists() and "." not in Path(self.path).name:
            self.path = "/index.html"
        return super().send_head()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 5173), SpaRequestHandler)
    print("Serving Attendify admin app at http://127.0.0.1:5173")
    server.serve_forever()
