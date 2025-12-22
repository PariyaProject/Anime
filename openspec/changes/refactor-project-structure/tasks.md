## 1. Preparation and Backup
- [x] 1.1 Create backup of current project structure
- [x] 1.2 Document all current file paths and their purposes
- [x] 1.3 Identify all file path references in code files
- [x] 1.4 Review clean/ directory contents to confirm they are legacy
- [x] 1.5 Plan .gitignore rules based on project needs

## 2. Create New Directory Structure
- [x] 2.1 Create data/ directory with subdirectories
- [x] 2.2 Create data/proxy/ for proxy server data
- [x] 2.3 Create data/testing/ for test artifacts
- [x] 2.4 Create data/archive/ for old data
- [x] 2.5 Create cycani-proxy/src/ for server source code

## 2.5. Create .gitignore File
- [x] 2.5.1 Create comprehensive .gitignore in project root
- [x] 2.5.2 Add Node.js ignore rules (node_modules/, npm-debug.log)
- [x] 2.5.3 Add runtime data ignores (data/proxy/runtime/*, cache files)
- [x] 2.5.4 Add OS and IDE ignores (.DS_Store, .vscode/, etc.)
- [x] 2.5.5 Include important data files in version control

## 3. Move and Organize Data Files
- [x] 3.1 Move proxy server JSON files to data/proxy/
  - [x] 3.1.1 Move watch-history.json
  - [x] 3.1.2 Move anime-list-detail.json and current-anime-list.json
  - [x] 3.1.3 Move runtime cache files
- [x] 3.2 Move debug/test JSON files to data/testing/
  - [x] 3.2.1 Move root directory debug snapshots
  - [x] 3.2.2 Move cycani-proxy debug files
  - [x] 3.2.3 Organize by type (snapshots/, debug/)
- [x] 3.3 Move screenshot files to data/testing/screenshots/
- [x] 3.4 Archive clearly redundant files to data/archive/

## 4. Remove Legacy Files and Directories
- [x] 4.1 Archive clean/ directory contents to data/archive/legacy-userscripts/
- [x] 4.2 Delete clean/ directory after confirming backup
- [x] 4.3 Remove any remaining temporary or junk files in root
- [x] 4.4 Verify that only essential project files remain in root

## 5. Update Code References
- [x] 5.1 Update server.js file paths for watch-history.json
- [x] 5.2 Update any hardcoded paths in proxy server
- [x] 5.3 Update documentation references to old file locations
- [x] 5.4 Test that all file reads/writes work with new paths

## 6. Clean and Optimize
- [x] 6.1 Review and remove redundant test snapshots
- [x] 6.2 Clean up cycani-proxy directory (move only src files)
- [x] 6.3 Verify no important data was lost in migration

## 7. Verification and Testing
- [x] 7.1 Start proxy server and verify it finds data files
- [x] 7.2 Test watch history functionality
- [x] 7.3 Verify all API endpoints still work
- [x] 7.4 Check that .gitignore is working correctly
- [x] 7.5 Run comprehensive functionality tests

## 8. Documentation Updates
- [x] 8.1 Update CLAUDE.md with new project structure (remove clean/ references)
- [x] 8.2 Update README.md with new file locations
- [x] 8.3 Update openspec/project.md with new conventions
- [x] 8.4 Document data organization strategy

## 9. Final Cleanup
- [x] 9.1 Remove any remaining temporary files
- [x] 9.2 Verify project size is optimized
- [x] 9.3 Final validation that everything works
- [x] 9.4 Remove backup if verification successful