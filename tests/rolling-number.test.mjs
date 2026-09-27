import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";

// Render the actual component to check digit alignment and frame-driven movement.
const source = readFileSync(new URL("../src/video/rolling-number.tsx", import.meta.url), "utf8");
const {outputText} = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
});
const compiled = {exports: {}};
new Function("require", "module", "exports", outputText)(
  createRequire(import.meta.url),
  compiled,
  compiled.exports,
);
const render = (value, previous = value, progress = 1) =>
  renderToStaticMarkup(
    createElement(compiled.exports.RollingNumber, {value, previous, progress, maximum: 2_900_000}),
  );
for (const value of [0, 171_773, 999_999, 1_000_000]) {
  const markup = render(value);
  assert.match(markup, /<text x="0" y="60">/, `${value} must start at the left edge`);
  assert.match(
    markup,
    /viewBox="0 0 400 72"/,
    "outer geometry must stay fixed across the million boundary",
  );
}
assert.notEqual(render(10, 9, 0.5), render(10, 9, 1), "intermediate frames retain rolling motion");
console.log("Rolling number checks passed");
