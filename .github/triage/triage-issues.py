#!/usr/bin/env python3
"""Intake triage of an issue filed through a contributor form (priitkustala/ai-news#118).

Modes:
  no argument                      the workflow: reads ISSUE_NUMBER and GITHUB_REPOSITORY, posts the
                                   comment and swaps needs-triage for triaged when complete
  --fixture <body> [--comments <json>]   offline: prints the decision, runs no gh
  --dry-run <owner/repo>           read only: the decision for each open needs-triage issue
  --pending <owner/repo>           read only: open triaged issues with no project item

The issue text is untrusted data: it is parsed, never printed, never posted and never placed in a
command. A comment is built only from the form's field names, digits and the rank word.
"""
import json
import os
import re
import subprocess
import sys

MARKER = "<!-- triage:v1 -->"
TRUSTED_AUTHORS = ("github-actions", "github-actions[bot]")
BUG = ["Precondition", "Steps", "Actual", "Expected", "Evidence", "Relevance", "Importance"]
FEATURE = ["Problem", "Who has it", "What they want", "How they would know it works", "Relevance", "Importance"]
SCALED = ("Relevance", "Importance")
RANKS = {9: "Now", 6: "Now", 4: "Next", 3: "Next", 2: "Later", 1: "Later"}
REPO = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
NUMBER = re.compile(r"[0-9]+")


def gh(args, stdin=None):
    """Run one gh command; the only command call of this script."""
    log = os.environ.get("TRIAGE_CALL_LOG")
    if log:
        with open(log, "a", encoding="utf-8") as f:
            f.write(args[0] + " " + args[1] + "\n")
    done = subprocess.run(["gh"] + args, input=stdin, stdout=subprocess.PIPE, text=True)
    if done.returncode != 0:
        sys.exit("gh %s %s failed with exit %d" % (args[0], args[1], done.returncode))
    return done.stdout


def check_form(body):
    """Return the missing or empty fields in the form's order, and the two scale values."""
    lines = [line.rstrip(" \r") for line in body.split("\n")]
    labels = BUG if any("### " + label in lines for label in BUG[:5]) else FEATURE
    headings = {"### " + label for label in labels}
    starts = [i for i, line in enumerate(lines) if line in headings] + [len(lines)]
    missing, values = [], {}
    for label in labels:
        at = [i for i in starts[:-1] if lines[i] == "### " + label]
        answer = ""
        if len(at) == 1:
            end = starts[starts.index(at[0]) + 1]
            answer = "\n".join(lines[at[0] + 1:end]).strip()
        ok = answer not in ("", "_No response_")
        if ok and label in SCALED:
            ok = answer[0] in "123" and not answer[1:2].isdigit()
            if ok:
                values[label] = int(answer[0])
        if not ok:
            missing.append(label)
    return missing, values


def first_line(body):
    """The comment's first line and whether the form is complete."""
    missing, values = check_form(body)
    if missing:
        return "Triage (workflow): incomplete. Missing or empty: %s." % ", ".join(missing), False
    relevance, importance = values["Relevance"], values["Importance"]
    score = relevance * importance
    return ("Triage (workflow): complete. Priority note: relevance %d, importance %d, score %d, rank %s. "
            "Set from the reporter's answers; the team may change it with a reason. "
            "Next: board admission pass (the orchestrator)." % (relevance, importance, score, RANKS[score])), True


def decide(body, comments):
    """The comment's first line and the actions; no action when the workflow already said the same."""
    line, complete = first_line(body)
    trusted = [c["body"] for c in comments if c["author"] in TRUSTED_AUTHORS and MARKER in c["body"]]
    if trusted and trusted[-1].split("\n")[0].rstrip(" \r") == line:
        return line, []
    return line, ["comment"] + (["remove-label needs-triage", "add-label triaged"] if complete else [])


def print_actions(actions):
    for action in actions:
        print("ACTION " + action)
    if not actions:
        print("ACTIONS NONE")


def read_issue(repo, number):
    data = json.loads(gh(["issue", "view", number, "--repo", repo, "--json", "body,comments"]))
    comments = [{"author": (c.get("author") or {}).get("login") or "", "body": c.get("body") or ""}
                for c in data.get("comments") or []]
    return data.get("body") or "", comments


def run_workflow():
    number = os.environ.get("ISSUE_NUMBER", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not NUMBER.fullmatch(number) or not REPO.fullmatch(repo):
        print("ISSUE_NUMBER must be digits and GITHUB_REPOSITORY must be set")
        return 2
    line, actions = decide(*read_issue(repo, number))
    if "comment" in actions:
        gh(["issue", "comment", number, "--repo", repo, "--body-file", "-"], line + "\n" + MARKER + "\n")
    if "add-label triaged" in actions:
        gh(["issue", "edit", number, "--repo", repo, "--remove-label", "needs-triage", "--add-label", "triaged"])
    print_actions(actions)
    return 0


def run_fixture(body_file, comments_file):
    with open(body_file, encoding="utf-8") as f:
        body = f.read()
    comments = []
    if comments_file:
        with open(comments_file, encoding="utf-8") as f:
            comments = json.load(f)
    line, actions = decide(body, comments)
    if actions:
        print("COMMENT BEGIN")
        print(line)
        print(MARKER)
        print("COMMENT END")
    print_actions(actions)
    return 0


def run_dry_run(repo):
    listed = gh(["issue", "list", "--repo", repo, "--label", "needs-triage", "--state", "open",
                 "--json", "number", "--limit", "100"])
    for item in json.loads(listed):
        number = str(int(item["number"]))
        print("ISSUE " + number)
        print_actions(decide(*read_issue(repo, number))[1])
    return 0


def run_pending(repo):
    listed = gh(["issue", "list", "--repo", repo, "--label", "triaged", "--state", "open",
                 "--json", "number,projectItems", "--limit", "100"])
    count = 0
    for item in json.loads(listed):
        if not item.get("projectItems"):
            print("PENDING %s#%d" % (repo, int(item["number"])))
            count += 1
    print("PENDING COUNT %d" % count)
    return 0


def main(argv):
    if not argv:
        return run_workflow()
    if argv[0] == "--fixture" and len(argv) == 2:
        return run_fixture(argv[1], None)
    if argv[0] == "--fixture" and len(argv) == 4 and argv[2] == "--comments":
        return run_fixture(argv[1], argv[3])
    if argv[0] in ("--dry-run", "--pending") and len(argv) == 2 and REPO.fullmatch(argv[1]):
        return run_dry_run(argv[1]) if argv[0] == "--dry-run" else run_pending(argv[1])
    print("usage: triage-issues.py [--fixture <body> [--comments <json>] | --dry-run <owner/repo> | --pending <owner/repo>]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
