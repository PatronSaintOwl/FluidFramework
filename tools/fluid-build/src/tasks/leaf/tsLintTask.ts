/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { LeafTask, LeafWithDoneFileTask } from "./leafTask";
import { TscTask } from "./tscTask";
import { readFileAsync } from "../../common/utils";
import { existsSync } from "fs";

export class TsLintTask extends LeafWithDoneFileTask {
    private tscTask: TscTask | undefined;
    protected get recheckLeafIsUpToDate() {
        return true;
    }
    protected get doneFile() {
        // TODO: This assume there is only one tslint task per package
        return "tslint.done.build.log";
    }

    protected async getDoneFileContent() {
        try {
            const doneFileContent = { tsBuildInfoFile: {}, tslintJson: "" };
            if (this.tscTask) {
                const tsBuildInfo = await this.tscTask.readTsBuildInfo();
                if (tsBuildInfo === undefined) {
                    return undefined;
                }
                doneFileContent.tsBuildInfoFile = tsBuildInfo;
                const configFile = this.configFileFullPath;
                if (existsSync(configFile)) {
                    // Include the config file if it exists so that we can detect changes
                    doneFileContent.tslintJson = await readFileAsync(this.configFileFullPath, "utf8");
                }
            }
            return JSON.stringify(doneFileContent);
        } catch(e) {
            this.logVerboseTask(`error generating done file content ${e}`);
            return undefined;
        }
    }

    protected addDependentTasks(dependentTasks: LeafTask[]) {
        for (const child of this.node.dependentPackages) {
            // TODO: Need to look at the output from tsconfig
            if (this.addChildTask(dependentTasks, child, "tsc")) {
                this.logVerboseDependency(child, "tsc");
            }
        }
        const tscTask = this.addChildTask(dependentTasks, this.node, "tsc");
        if (tscTask) {
            this.tscTask = tscTask as TscTask;
            this.logVerboseDependency(this.node, "tsc");
        }
    }

    private get configFileFullPath() {
        return this.getPackageFileFullPath("tslint.json");
    }

}