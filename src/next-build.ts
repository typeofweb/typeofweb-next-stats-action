import Fse from 'fs-extra';

import { execAsync } from './utils';

export async function build(prDirectory: string, baseDirectory: string) {
  await Fse.copyFile(`${prDirectory}/.env-sample`, `${prDirectory}/.env`);
  await Fse.copyFile(`${baseDirectory}/.env-sample`, `${baseDirectory}/.env`);

  const prOutput = await execAsync(`cd ${prDirectory} && yarn && NODE_ENV=production yarn build`);
  const baseOutput = await execAsync(
    `cd ${baseDirectory} && yarn && NODE_ENV=production yarn build`,
  );
  const prCommit = await execAsync(`cd ${prDirectory} && git rev-parse --short HEAD`);
  const baseCommit = await execAsync(`cd ${baseDirectory} && git rev-parse --short HEAD`);
  return { prOutput, baseOutput, prCommit, baseCommit };
}
