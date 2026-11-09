# Contributor forms

Two forms hand in work to the team: **Bug** and **Feature request**. Blank issues are switched off, so every issue arrives with the answers the team needs to rank it. The same four files live in both app repositories (ai-news and ai-news-frontend), byte for byte.

## The method

The reporter answers two questions, each on a scale of 3, 2, 1:

- **Relevance**: how close is this to what AI News is for (finding, reading and trusting AI news on an iPhone)? 3 Core, 2 Supporting, 1 Peripheral or not sure.
- **Importance**: how much does this matter to the people who read the news in the app? 3 High (they cannot read, or lose or see wrong things), 2 Medium (slowed or annoyed, can carry on), 1 Low (nice to have).

Score = relevance x importance (1 to 9). Rank: **Now** for 6 or 9, **Next** for 3 or 4, **Later** for 1 or 2.

## Who decides

The team decides. The reporter's answers are input; the team may change them and gives a reason. The reporter never sets the final rank or the severity label. There is no priority field in the forms.

## Input, not a board item

An issue labelled `needs-triage` or `triaged` is input and not a board item. `needs-triage` is applied by the form; `triaged` is applied by the team once it has looked. An issue reaches the board only through the admission pass (the four task skills).

## The priority note

The team records the result in its triage comment, in this form:

`Priority note: relevance R, importance I, score N, rank Now|Next|Later`

For example: `Priority note: relevance 3, importance 3, score 9, rank Now`.
