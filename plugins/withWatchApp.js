const { withDangerousMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withWatchApp(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosDir = path.join(config.modRequest.projectRoot, 'ios');
      const watchDir = path.join(iosDir, 'VITTAUPWatch');

      if (!fs.existsSync(watchDir)) {
        console.warn('[withWatchApp] VITTAUPWatch not found');
        return config;
      }

      const pbxprojPath = path.join(iosDir, 'VITTAUP.xcodeproj', 'project.pbxproj');
      let pbx = fs.readFileSync(pbxprojPath, 'utf8');

      if (pbx.includes('VITTAUPWatch')) {
        console.log('[withWatchApp] Already patched');
        return config;
      }

      console.log('[withWatchApp] Adding watch target to Xcode project...');

      const U = {
        tgt: 'WA00000000000000000001', prod: 'WA00000000000000000002',
        cfgList: 'WA00000000000000000003', dbgCfg: 'WA00000000000000000004', relCfg: 'WA00000000000000000005',
        srcPhase: 'WA00000000000000000006', resPhase: 'WA00000000000000000007', grp: 'WA00000000000000000008',
        embedPhase: 'WA00000000000000000009', embedFile: 'WA0000000000000000000A',
        dep: 'WA0000000000000000000B', proxy: 'WA0000000000000000000C',
        f1: 'WA0000000000000000000D', f1b: 'WA0000000000000000000E', // VITTAUPWatchApp.swift
        f2: 'WA0000000000000000000F', f2b: 'WA00000000000000000010', // ContentView.swift
        f3: 'WA00000000000000000011', f3b: 'WA00000000000000000012', // WatchDataStore.swift
        f4: 'WA00000000000000000013', f4b: 'WA00000000000000000014', // NotificationHandler.swift
        f5: 'WA00000000000000000015', f5b: 'WA00000000000000000016', // VITTAComplication.swift
        fPlist: 'WA00000000000000000017', fAssets: 'WA00000000000000000018', fAssetsB: 'WA00000000000000000019',
      };

      // Get main project UUID for container proxy
      const projMatch = pbx.match(/(\w+) \/\* Project object \*\/ = \{/);
      const projUuid = projMatch ? projMatch[1] : '83CBB9F71A601CBA00E9B192';

      // === PBXBuildFile ===
      const buildFiles = [
        `${U.f1b} /* VITTAUPWatchApp.swift */ = {isa = PBXBuildFile; fileRef = ${U.f1}; };`,
        `${U.f2b} /* ContentView.swift */ = {isa = PBXBuildFile; fileRef = ${U.f2}; };`,
        `${U.f3b} /* WatchDataStore.swift */ = {isa = PBXBuildFile; fileRef = ${U.f3}; };`,
        `${U.f4b} /* NotificationHandler.swift */ = {isa = PBXBuildFile; fileRef = ${U.f4}; };`,
        `${U.f5b} /* VITTAComplication.swift */ = {isa = PBXBuildFile; fileRef = ${U.f5}; };`,
        `${U.fAssetsB} /* Assets.xcassets */ = {isa = PBXBuildFile; fileRef = ${U.fAssets}; };`,
        `${U.embedFile} /* VITTAUPWatch.app */ = {isa = PBXBuildFile; fileRef = ${U.prod}; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };`,
      ].join('\n\t\t');
      pbx = pbx.replace('/* End PBXBuildFile section */', `\t\t${buildFiles}\n/* End PBXBuildFile section */`);

      // === PBXFileReference ===
      const fileRefs = [
        `${U.prod} /* VITTAUPWatch.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = VITTAUPWatch.app; sourceTree = BUILT_PRODUCTS_DIR; };`,
        `${U.f1} /* VITTAUPWatchApp.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = VITTAUPWatchApp.swift; sourceTree = "<group>"; };`,
        `${U.f2} /* ContentView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ContentView.swift; sourceTree = "<group>"; };`,
        `${U.f3} /* WatchDataStore.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WatchDataStore.swift; sourceTree = "<group>"; };`,
        `${U.f4} /* NotificationHandler.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = NotificationHandler.swift; sourceTree = "<group>"; };`,
        `${U.f5} /* VITTAComplication.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = VITTAComplication.swift; sourceTree = "<group>"; };`,
        `${U.fPlist} /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };`,
        `${U.fAssets} /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };`,
      ].join('\n\t\t');
      pbx = pbx.replace('/* End PBXFileReference section */', `\t\t${fileRefs}\n/* End PBXFileReference section */`);

      // === PBXGroup ===
      pbx = pbx.replace('/* End PBXGroup section */', `\t\t${U.grp} /* VITTAUPWatch */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t${U.f1},\n\t\t\t\t${U.f2},\n\t\t\t\t${U.f3},\n\t\t\t\t${U.f4},\n\t\t\t\t${U.f5},\n\t\t\t\t${U.fPlist},\n\t\t\t\t${U.fAssets},\n\t\t\t);\n\t\t\tpath = VITTAUPWatch;\n\t\t\tsourceTree = "<group>";\n\t\t};\n/* End PBXGroup section */`);

      // Add to main group
      pbx = pbx.replace(/(children = \(\s*\n(?:.*\n)*?)(.*\/\* VITTAUP \*\/)/, (m, before, vl) => `${before}\t\t\t\t${U.grp} /* VITTAUPWatch */,\n\t\t\t\t${vl}`);

      // === PBXNativeTarget ===
      pbx = pbx.replace('/* End PBXNativeTarget section */', `\t\t${U.tgt} /* VITTAUPWatch */ = {\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildConfigurationList = ${U.cfgList};\n\t\t\tbuildPhases = (\n\t\t\t\t${U.srcPhase},\n\t\t\t\t${U.resPhase},\n\t\t\t);\n\t\t\tbuildRules = ();\n\t\t\tdependencies = ();\n\t\t\tname = VITTAUPWatch;\n\t\t\tproductName = VITTAUPWatch;\n\t\t\tproductReference = ${U.prod};\n\t\t\tproductType = "com.apple.product-type.application";\n\t\t};\n/* End PBXNativeTarget section */`);

      // Add to project targets
      pbx = pbx.replace(/(targets = \(\s*\n(?:\s+\w+ \/\* .*\*\/,?\n)*)/, (m) => `${m}\t\t\t\t${U.tgt} /* VITTAUPWatch */,\n`);

      // === PBXSourcesBuildPhase ===
      pbx = pbx.replace('/* End PBXSourcesBuildPhase section */', `\t\t${U.srcPhase} /* Sources */ = {\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t${U.f1b},\n\t\t\t\t${U.f2b},\n\t\t\t\t${U.f3b},\n\t\t\t\t${U.f4b},\n\t\t\t\t${U.f5b},\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n/* End PBXSourcesBuildPhase section */`);

      // === PBXResourcesBuildPhase ===
      pbx = pbx.replace('/* End PBXResourcesBuildPhase section */', `\t\t${U.resPhase} /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t${U.fAssetsB},\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n/* End PBXResourcesBuildPhase section */`);

      // === XCBuildConfiguration ===
      const bs = `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n\t\t\t\tDEVELOPMENT_TEAM = SF25T2VT4C;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tINFOPLIST_FILE = VITTAUPWatch/Info.plist;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "fit.vittaup.app.watchkitapp";\n\t\t\t\tPRODUCT_NAME = VITTAUPWatch;\n\t\t\t\tSDKROOT = watchos;\n\t\t\t\tSWIFT_VERSION = 5.0;\n\t\t\t\tTARGETED_DEVICE_FAMILY = 4;\n\t\t\t\tWATCHOS_DEPLOYMENT_TARGET = 11.0;`;
      pbx = pbx.replace('/* End XCBuildConfiguration section */', `\t\t${U.dbgCfg} /* Debug */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\t${bs}\n\t\t\t};\n\t\t\tname = Debug;\n\t\t};\n\t\t${U.relCfg} /* Release */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\t${bs}\n\t\t\t};\n\t\t\tname = Release;\n\t\t};\n/* End XCBuildConfiguration section */`);

      // === XCConfigurationList ===
      pbx = pbx.replace('/* End XCConfigurationList section */', `\t\t${U.cfgList} /* Build configuration list for VITTAUPWatch */ = {\n\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = (\n\t\t\t\t${U.dbgCfg},\n\t\t\t\t${U.relCfg},\n\t\t\t);\n\t\t\tdefaultConfigurationIsVisible = 0;\n\t\t\tdefaultConfigurationName = Release;\n\t\t};\n/* End XCConfigurationList section */`);

      // === Embed Watch Content ===
      if (pbx.includes('/* End PBXCopyFilesBuildPhase section */')) {
        pbx = pbx.replace('/* End PBXCopyFilesBuildPhase section */', `\t\t${U.embedPhase} /* Embed Watch Content */ = {\n\t\t\tisa = PBXCopyFilesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tdstPath = "$(CONTENTS_FOLDER_PATH)/Watch";\n\t\t\tdstSubfolderSpec = 16;\n\t\t\tfiles = (\n\t\t\t\t${U.embedFile},\n\t\t\t);\n\t\t\tname = "Embed Watch Content";\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n/* End PBXCopyFilesBuildPhase section */`);
      } else {
        pbx = pbx.replace('/* Begin PBXResourcesBuildPhase section */', `/* Begin PBXCopyFilesBuildPhase section */\n\t\t${U.embedPhase} /* Embed Watch Content */ = {\n\t\t\tisa = PBXCopyFilesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tdstPath = "$(CONTENTS_FOLDER_PATH)/Watch";\n\t\t\tdstSubfolderSpec = 16;\n\t\t\tfiles = (\n\t\t\t\t${U.embedFile},\n\t\t\t);\n\t\t\tname = "Embed Watch Content";\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n/* End PBXCopyFilesBuildPhase section */\n\n/* Begin PBXResourcesBuildPhase section */`);
      }

      // Add embed + dependency to main target
      pbx = pbx.replace(/(\/\* VITTAUP \*\/ = \{\s*\n\s*isa = PBXNativeTarget;\s*\n\s*buildConfigurationList[^;]+;\s*\n\s*buildPhases = \(\s*\n(?:\s+\w+ \/\* .*\*\/,?\n)*)/, (m) => `${m}\t\t\t\t${U.embedPhase} /* Embed Watch Content */,\n`);

      // === Target Dependency ===
      pbx = pbx.replace(/(\/\* VITTAUP \*\/ = \{\s*\n\s*isa = PBXNativeTarget;\s*\n\s*buildConfigurationList[^;]+;\s*\n\s*buildPhases = \([^)]+\);\s*\n\s*buildRules = \([^)]*\);\s*\n\s*dependencies = \(\s*\n)/, (m) => `${m}\t\t\t\t${U.dep},\n`);

      // PBXContainerItemProxy + PBXTargetDependency
      const proxyAndDep = `/* Begin PBXContainerItemProxy section */\n\t\t${U.proxy} = {\n\t\t\tisa = PBXContainerItemProxy;\n\t\t\tcontainerPortal = ${projUuid};\n\t\t\tproxyType = 1;\n\t\t\tremoteGlobalIDString = ${U.tgt};\n\t\t\tremoteInfo = VITTAUPWatch;\n\t\t};\n/* End PBXContainerItemProxy section */\n\n/* Begin PBXTargetDependency section */\n\t\t${U.dep} = {\n\t\t\tisa = PBXTargetDependency;\n\t\t\ttarget = ${U.tgt};\n\t\t\ttargetProxy = ${U.proxy};\n\t\t};\n/* End PBXTargetDependency section */\n\n`;

      if (pbx.includes('/* Begin PBXContainerItemProxy section */')) {
        pbx = pbx.replace('/* End PBXContainerItemProxy section */', `\t\t${U.proxy} = {\n\t\t\tisa = PBXContainerItemProxy;\n\t\t\tcontainerPortal = ${projUuid};\n\t\t\tproxyType = 1;\n\t\t\tremoteGlobalIDString = ${U.tgt};\n\t\t\tremoteInfo = VITTAUPWatch;\n\t\t};\n/* End PBXContainerItemProxy section */`);
        pbx = pbx.replace('/* End PBXTargetDependency section */', `\t\t${U.dep} = {\n\t\t\tisa = PBXTargetDependency;\n\t\t\ttarget = ${U.tgt};\n\t\t\ttargetProxy = ${U.proxy};\n\t\t};\n/* End PBXTargetDependency section */`);
      } else {
        pbx = pbx.replace('/* Begin PBXBuildFile section */', `${proxyAndDep}/* Begin PBXBuildFile section */`);
      }

      fs.writeFileSync(pbxprojPath, pbx, 'utf8');

      // === Patch scheme ===
      const schemePath = path.join(iosDir, 'VITTAUP.xcodeproj', 'xcshareddata', 'xcschemes', 'VITTAUP.xcscheme');
      if (fs.existsSync(schemePath)) {
        let scheme = fs.readFileSync(schemePath, 'utf8');
        if (!scheme.includes('VITTAUPWatch')) {
          scheme = scheme.replace('</BuildActionEntries>', `         <BuildActionEntry\n            buildForTesting = "YES"\n            buildForRunning = "YES"\n            buildForProfiling = "YES"\n            buildForArchiving = "YES"\n            buildForAnalyzing = "YES">\n            <BuildableReference\n               BuildableIdentifier = "primary"\n               BlueprintIdentifier = "${U.tgt}"\n               BuildableName = "VITTAUPWatch.app"\n               BlueprintName = "VITTAUPWatch"\n               ReferencedContainer = "container:VITTAUP.xcodeproj">\n            </BuildableReference>\n         </BuildActionEntry>\n      </BuildActionEntries>`);
          fs.writeFileSync(schemePath, scheme, 'utf8');
        }
      }

      console.log('[withWatchApp] Watch target added with dependency + scheme + embed ✓');
      return config;
    },
  ]);
}

module.exports = withWatchApp;
