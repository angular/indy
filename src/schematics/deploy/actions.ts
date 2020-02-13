import { BuilderContext, targetFromTargetString } from "@angular-devkit/architect";
import { FirebaseTools } from "../interfaces";

export default async function deploy(
  firebaseTools: FirebaseTools,
  context: BuilderContext,
  projectRoot: string,
  buildTarget: string,
  firebaseProject?: string,
  firebaseToken?: string,
) {
  if (!firebaseProject) {
    throw new Error("Cannot find firebase project for your app in .firebaserc");
  }

  if (!firebaseToken) {
    await firebaseTools.login();
  }

  if (!context.target) {
    throw new Error("Cannot execute the build target");
  }

  context.logger.info(`📦 Building "${context.target.project}"`);

  const run = await context.scheduleTarget(targetFromTargetString(buildTarget));
  await run.result;

  try {
    await firebaseTools.use(firebaseProject, { project: firebaseProject });
  } catch (e) {
    throw new Error(`Cannot select firebase project '${firebaseProject}'`);
  }

  try {
    const success = await firebaseTools.deploy({
      only: "hosting:" + context.target.project,
      cwd: projectRoot,
      token: firebaseToken
    });
    context.logger.info(
      `🚀 Your application is now available at https://${
        success.hosting.split("/")[1]
      }.firebaseapp.com/`
    );
  } catch (e) {
    context.logger.error(e);
  }
}
