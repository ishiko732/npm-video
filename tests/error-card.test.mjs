import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/error-card.tsx", import.meta.url), "utf8");
const {outputText} = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
});
const compiled = {exports: {}};
const heroui = await import("@heroui/react");
const require = createRequire(import.meta.url);
new Function("require", "module", "exports", outputText)(
  (name) => (name === "@heroui/react" ? heroui : require(name)),
  compiled,
  compiled.exports,
);
const render = (message) =>
  renderToStaticMarkup(
    createElement(compiled.exports.ErrorCard, {
      packageName: "ts-fsrs",
      message,
      onRetry: () => {},
    }),
  );
const failed = render("Network request failed");
assert.match(failed, /Network request failed/);
assert.match(failed, /role="alert"/);
assert.match(failed, />Retry</);
assert.doesNotMatch(failed, /Package not found/);
assert.match(render(), /Package not found/);
assert.match(render(), />Retry</);
console.log("Retry error card checks passed");
