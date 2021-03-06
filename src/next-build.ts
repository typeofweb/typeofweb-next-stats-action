import * as Core from '@actions/core';
import Fse from 'fs-extra';

import { readCache } from './octokit';
import { execAsync } from './utils';

export async function build(prDirectory: string, baseDirectory: string) {
  const prCommit = await execAsync(`cd ${prDirectory} && git rev-parse HEAD:`);
  const baseCommit = await execAsync(`cd ${baseDirectory} && git rev-parse HEAD:`);

  const prOutput = (await readCache({ commit: prCommit })) ?? (await buildNext(prDirectory));
  Core.startGroup('prOutput');
  Core.debug(prOutput);
  Core.endGroup();

  const baseOutput = (await readCache({ commit: baseCommit })) ?? (await buildNext(baseDirectory));
  Core.startGroup('prOutput');
  Core.debug(baseOutput);
  Core.endGroup();

  return { prOutput, baseOutput, prCommit, baseCommit };
}

async function buildNext(path: string) {
  Core.debug(`Building Next.js for ${path}`);
  await Fse.copyFile(`${path}/.env-sample`, `${path}/.env`);
  await execAsync(`cd ${path} && yarn`);
  return execAsync(`cd ${path} && NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production yarn build`);
}
