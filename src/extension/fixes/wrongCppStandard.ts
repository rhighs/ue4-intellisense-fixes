// Sets cppStandard if overridden in extension's settings
// Shows how everything is set
// Warns if no cppStandard is set
// Warns about UE4/UE5 default cppStandard


import * as vscode from "vscode";

import type { CCppConfigurationJson } from "../../project/ntypes";
import type { ProjectUE4 } from "../../project/projectUE4";
import { CONFIG_SECTION_EXTENSION, WORKSPACE_FOLDER_NAME_UE5 } from "../../consts";

import * as console from "../../console";


const EXTENSION_CPP_STANDARD_SETTING = "cppStandard";
const VSC_CCPP_STANDARD_SETTING = `default.${EXTENSION_CPP_STANDARD_SETTING}`;
const DEFAULT_UE5_CPP_STANDARD = "c++17"


export function fixWrongCppStandard(project: ProjectUE4) {
    console.log("Attempting to fix wrong cppStandard.");

    console.log("Info : UE4 should be default c++14 (it can be c++17 with some special configuration)")
    console.log("Info : UE5 should be c++17");

    const extensionSettings = vscode.workspace.getConfiguration(CONFIG_SECTION_EXTENSION); // change to extension cppStandard
    const extensionCppStandard = extensionSettings?.get<string>(EXTENSION_CPP_STANDARD_SETTING);

    let isOverride = true;

    if (!extensionCppStandard) {
        if (extensionCppStandard !== '') {
            console.error("Error getting cppStandard setting.\nUE4 will use cpptool's cppStandard setting instead of this extension's setting.");
        }
        else {
            console.log("Extension's cppStandard setting was set to empty string.\nIntellisense will use cpptools cppStandard setting instead of this extension's setting.");
        }
        isOverride = false;
    }

    const isUE5 = vscode.workspace.workspaceFolders?.find(value => {
        return value.name === WORKSPACE_FOLDER_NAME_UE5
    });

    let isWarnedAboutUE5 = false;
    if (isUE5 && extensionCppStandard && extensionCppStandard !== DEFAULT_UE5_CPP_STANDARD) {
        console.error("UE5 should be c++17 but you have a different cppStandard forced in this extension's settings!");
        isWarnedAboutUE5 = true;
    }

    const workSpacesCCppConfigs: Record<string, CCppConfigurationJson[]> | undefined = getWorkspacesCCppConfigs(project);
    if (!workSpacesCCppConfigs) {
        console.error("Error getting workspaces. The cppStandard won't be changed.");
        return;
    }

    // TODO this code is very unreadable...
    for (const key in workSpacesCCppConfigs) {
        const workspaceVscodeConfig = project.getCCppSettingsConfig(key);
        let currentVSCodeCppStandard: string | undefined | null = "";

        if (workspaceVscodeConfig) {
            currentVSCodeCppStandard = workspaceVscodeConfig.get(VSC_CCPP_STANDARD_SETTING);
            if (currentVSCodeCppStandard || currentVSCodeCppStandard === '') {
                console.log(`Current VSCode/cpptools cppStandard is: ${currentVSCodeCppStandard} (Can be blank)`);
            }

        }

        for (const config of workSpacesCCppConfigs[key]) {
            if (!config.cppStandard && !currentVSCodeCppStandard && !extensionCppStandard) {
                console.error("No cppStandard is set. Please force a standard in this extension's settings.");
            }

            if (!isWarnedAboutUE5 && config.cppStandard && config.cppStandard !== ''
                && config.cppStandard !== DEFAULT_UE5_CPP_STANDARD) {
                console.error(`UE5 should be c++17 but you have a different cppStandard in ${key} c_cpp_properties.json`);
                isWarnedAboutUE5 = true;
        }

            console.log(`Current c_cpp_properties.json's cppStandard is: ${config.cppStandard} (Overrides VSCode/cpptools if not undefined)`)
            if (isOverride && extensionCppStandard != config.cppStandard) {
                config.cppStandard = extensionCppStandard;
                console.log(`This extension set ${key} workspace c_cpp_properties.json's cppStandard to ${extensionCppStandard}`);
            }
            else if (isOverride && extensionCppStandard === config.cppStandard) {
                console.log(`${key} workspace c_cpp_properties.json's cppStandard is already set.`)
            }
        }

        if (!isWarnedAboutUE5 && currentVSCodeCppStandard && currentVSCodeCppStandard !== ''
                && currentVSCodeCppStandard !== DEFAULT_UE5_CPP_STANDARD) {
                console.error(`UE5 should be c++17 but you have a different cppStandard in ${key} VSCode configs`);
                console.error("You should force a cppStandard in this extension's settings.")
                isWarnedAboutUE5 = true;
        }

    }

    // NOTE: These configs automatically get checked for saving when extension is done. Don't need to save them  here.
}


/**
 * @param project 
 * @logs error
 */
function getWorkspacesCCppConfigs(project: ProjectUE4): Record<string, CCppConfigurationJson[]> | undefined {
    const mainCCppPropertiesConfiguration = project.getCCppConfigurationsFromWorkspace(project.mainWorkspaceKey);
    if (!mainCCppPropertiesConfiguration) {
        console.error("Couldn't get Main c_cpp_properties.json's first configuration.");
        return;
    }

    const ue4CCppPropertiesConfiguration = project.getCCppConfigurationsFromWorkspace(project.ue4WorkspaceKey);
    if (!ue4CCppPropertiesConfiguration) {
        console.error("Couldn't get UE4 c_cpp_properties.json's first configuration.");
        return;
    }

    const workspaces: Record<string, CCppConfigurationJson[]> = {};
    workspaces[project.mainWorkspaceKey] = mainCCppPropertiesConfiguration;
    workspaces[project.ue4WorkspaceKey] = ue4CCppPropertiesConfiguration;

    return workspaces;
}
