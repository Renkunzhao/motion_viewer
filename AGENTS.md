# Motion Viewer — Repository Agent Rules

## Default language
- Reply in Chinese by default even if I ask in English.
- Keep code, commands, filenames, and identifiers in English.
- If necessary, include English keywords once in parentheses, then continue in Chinese.
- If I mix Chinese and English in the same sentence, provide a translation for the mixed word/phrase (Chinese↔English) while keeping the overall reply in Chinese.

## Required workflow
- Provide a brief plan first (files to touch + validation steps), then make changes.
- When adding new features, do not break existing functionality or workflows unless I explicitly request it.
- Use README.md to understand existing funionality.
- Add comments where helpful for future maintenance and readability, but keep the implementation as simple and non-redundant as possible.

- `ref/` contains open-source reference repositories with functionality similar to this project; when implementing features, prefer searching `ref/` first for related examples/implementations.
- `models/` and `motions/` store robot model files and motion files, respectively; consult them when you need concrete asset formats, conventions, or example data.
- Reference index: see the project list/short descriptions in `https://github.com/Renkunzhao/legged-robotics-lab/blob/main/README.md` for ideas of similar repos to consult.
- These folders can be large: search and read on-demand only (open only the few files relevant to the current task), and do not blindly scan/load entire directories.

- After implementing a request, you must update BOTH READMEs:
  - README.md (English)
  - README.zh.md (Chinese)
  Keep the information consistent across both files, and only edit the relevant sections.

## Safety
- If necessary, you may `git clone` an open-source repository into `ref/` for reference, but only after I explicitly approve.
- Prefer a minimal clone (e.g., shallow clone and/or single-branch) and do not download large assets unless required.
- Do not run `git commit`, `git push`, or `gh pr create` unless I explicitly approve.
- Before executing any of the above, print the exact commands you plan to run and wait for approval.
- Prefer feature branches by default (do not push to main/master unless asked).