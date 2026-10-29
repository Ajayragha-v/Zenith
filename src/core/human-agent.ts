import readline from "readline";

export class HumanAgent {
  /**
   * Pauses the pipeline and asks the user (Explainer/Authoriser) a question.
   */
  static async ask(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`\n🤖 Zenith: ${question}\n👤 You: `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}