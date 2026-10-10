import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  approvePath,
  resolvePathWithinDirectory,
  validatePath,
  validateTempRecordingInput,
} from "./path-validation.ts";

describe("resolvePathWithinDirectory", () => {
  it("accepts a file directly inside the directory", () => {
    assert.equal(
      resolvePathWithinDirectory("/tmp/ltx-desktop-recordings", "recording.wav"),
      path.resolve("/tmp/ltx-desktop-recordings", "recording.wav"),
    );
  });

  it("rejects child paths that escape the directory", () => {
    assert.throws(
      () =>
        resolvePathWithinDirectory(
          "/tmp/ltx-desktop-recordings",
          ".wav/../../../unwanted-file",
        ),
      /must remain within the directory/,
    );
  });

  it("rejects the directory itself as a child file", () => {
    const directory = path.resolve("project", "assets");
    assert.throws(
      () => resolvePathWithinDirectory(directory, "."),
      /must remain within the directory/,
    );
  });

  it("rejects a sibling whose name begins with the directory name", () => {
    const directory = path.resolve("project", "assets");
    assert.throws(
      () =>
        resolvePathWithinDirectory(
          directory,
          path.join("..", "assets-other", "clip.mp4"),
        ),
      /must remain within the directory/,
    );
  });
});

describe("validatePath", () => {
  it("stops allowing a project folder when it is removed from allowed roots", () => {
    const projectFolder = path.resolve("test-project-folder-removable");
    const asset = path.join(projectFolder, "assets", "clip.mp4");
    assert.equal(validatePath(asset, [projectFolder]), asset);
    assert.throws(() => validatePath(asset, []), /Path not allowed/);
  });

  it("allows files in an approved project folder, including nested files", () => {
    const projectFolder = path.resolve("test-project-folder");
    approvePath(projectFolder);
    assert.equal(
      validatePath(path.join(projectFolder, "assets", "clip.mp4"), []),
      path.join(projectFolder, "assets", "clip.mp4"),
    );
  });

  it("does not extend approval to a similarly named sibling", () => {
    const projectFolder = path.resolve("test-project-folder-boundary");
    approvePath(projectFolder);
    const siblingFile = path.resolve("test-project-folder-boundary-other", "clip.mp4");
    assert.throws(() => validatePath(siblingFile, []), /Path not allowed/);
  });
});

describe("validateTempRecordingInput", () => {
  it("rejects a suffix other than wav", () => {
    assert.throws(
      () => validateTempRecordingInput(".wav/../../../unwanted-file", new ArrayBuffer(1)),
      /Only WAV recording files are supported/,
    );
  });

  it("rejects recording data over 100 MB", () => {
    assert.throws(
      () => validateTempRecordingInput(".wav", new ArrayBuffer(100 * 1024 * 1024 + 1)),
      /Recording data exceeds the maximum supported size/,
    );
  });

  it("rejects non-binary recording data", () => {
    assert.throws(
      () => validateTempRecordingInput(".wav", "not a recording"),
      /Recording data must be an ArrayBuffer/,
    );
  });
});
