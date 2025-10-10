import * as core from "@actions/core";
import * as github from "@actions/github";
import { exec } from 'child_process';
import * as fs from 'fs/promises';

// NOTE: In a real GitHub Action, you would use '@actions/exec'
// for robust command execution and error handling. This helper
// function simulates that execution.
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (stdout) core.info(stdout);
      if (stderr) core.error(stderr);
      
      if (error) {
        // Only reject if there's a non-zero exit code, otherwise
        // sometimes stderr is used for informational messages.
        reject(new Error(`Command failed with code ${error.code}: ${command}`));
        return;
      }
      resolve(stdout);
    });
  });
}

/**
 * Installs Cloudflare WARP client and configures it using MDM credentials.
 */
async function run() {
  try {
    const org_name = core.getInput("org_name", { required: true });
    const client_id = core.getInput("client_id", { required: true });
    const client_secret = core.getInput("client_secret", { required: true });
    
    core.info(`Starting Cloudflare WARP Zero Trust setup for organization: ${org_name}`);

    // --- 1. Install WARP Client (Assuming Ubuntu/Debian Runner) ---
    core.info("1. Installing Cloudflare WARP client...");
    
    // Add the Cloudflare package signing key
    await executeCommand('curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg');
    
    // Add the Cloudflare repository
    await executeCommand('echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-warp.list');
    
    // Update package lists and install
    await executeCommand('sudo apt-get update');
    await executeCommand('sudo apt-get install -y cloudflare-warp');

    core.info("Cloudflare WARP client installed successfully.");


    // --- 2. Generate and Write MDM Configuration File ---
    const mdm_folder = '/var/lib/cloudflare-warp/';
    const mdm_file = mdm_folder + 'mdm.xml';
    const temp_mdm_file = `/tmp/mdm.xml`;

    // The MDM configuration file content
    const mdm_xml_content = `
<dict>
  <key>organization</key>
  <string>${org_name}</string>
  <key>auth_client_id</key>
  <string>${client_id}</string>
  <key>auth_client_secret</key>
  <string>${client_secret}</string>
</dict>
`;

    // Ensure the WARP config folder exists (it should after install, but good practice)
    await fs.mkdir(mdm_folder, { recursive: true });
    
    // Write the MDM configuration file
    await fs.writeFile(temp_mdm_file, mdm_xml_content.trim(), 'utf8');
    await executeCommand(`sudo mv ${temp_mdm_file} ${mdm_file}`);

    core.info(`MDM configuration written to ${mdm_file}.`);

    // --- 3. Configure and Connect WARP ---
    core.info("3. Configuring and connecting WARP client...");

    await executeCommand(`sudo warp-cli --accept-tos settings`);
    
    // // Switch to Zero Trust mode
    // await executeCommand('sudo warp-cli mode zero_trust');
    
    // Connect the client
    await executeCommand('sudo warp-cli --accept-tos connect');

    // Wait for the connection to be fully established (optional, but safer)
    await new Promise(resolve => setTimeout(resolve, 5000)); 
    
    // Verify status
    const status = await executeCommand('sudo warp-cli --accept-tos status');
    core.info("--- WARP Status ---");
    core.info(status);
    core.info("-------------------");
    
    if (!status.includes("Status: Connected")) {
      throw new Error("WARP client failed to connect.");
    }

    core.setOutput("warp-status", "Connected");
    core.info("Cloudflare WARP Zero Trust connection successful!");

  } catch (error) {
    core.setFailed(error.message);
  }
}

// Execute the main function
run();
