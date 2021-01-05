import * as Core from '@actions/core';
import * as GitHub from '@actions/github';

import { build } from './next-build';
import { generateComparison } from './next-size-comparison';
import { getComparisonMarkdown, HEADER } from './next-size-formatter';
import { getNextPagesSize } from './next-size-generator';

async function run() {
  Core.debug(
    JSON.stringify(
      {
        ...GitHub.context,
        issue: GitHub.context.issue,
        repo: GitHub.context.repo,
      },
      null,
      2,
    ),
  );

  Core.startGroup('build');
  const prDirectory = Core.getInput('pr_directory_name');
  const baseDirectory = Core.getInput('base_directory_name');

  const { prOutput, baseOutput, prCommit, baseCommit } = await build(prDirectory, baseDirectory);
  Core.endGroup();

  Core.startGroup('calculateSizes');
  const [prResult, baseResult] = await Promise.all([
    getNextPagesSize(prOutput),
    getNextPagesSize(baseOutput),
  ]);
  Core.endGroup();

  Core.startGroup('postComment');
  const comparison = generateComparison({
    currentResult: prResult,
    previousResult: baseResult,
  });

  const markdown = getComparisonMarkdown({
    ...comparison,
    commitRange: `${baseCommit}...${prCommit}`,
  });
  Core.debug(markdown);

  const prNumber =
    GitHub.context.payload.pull_request?.number ??
    (GitHub.context.payload.issue?.html_url?.includes('/pull/')
      ? GitHub.context.issue.number
      : undefined);

  if (!prNumber) {
    return Core.setFailed('Not a PR!');
  }
  if (!process.env.GITHUB_TOKEN) {
    return Core.setFailed('Missing GITHUB_TOKEN!');
  }

  const Octokit = GitHub.getOctokit(process.env.GITHUB_TOKEN);

  const existingComment = await findExistingComment(Octokit, GitHub.context, prNumber);
  Core.debug(JSON.stringify({ existingComment }));

  if (existingComment) {
    await Octokit.issues.updateComment({
      ...GitHub.context.repo,
      comment_id: existingComment.id,
      body: markdown,
    });
  } else {
    await Octokit.issues.createComment({
      ...GitHub.context.repo,
      issue_number: prNumber,
      body: markdown,
    });
  }

  Core.endGroup();
}

async function findExistingComment(
  Octokit: ReturnType<typeof GitHub.getOctokit>,
  Context: typeof GitHub.context,
  prNumber: number,
) {
  const { data: comments } = await Octokit.issues.listComments({
    ...Context.repo,
    issue_number: prNumber,
  });
  return comments.find((comment) => comment.body?.includes(HEADER));
}

run().catch((err) => Core.setFailed(err));
