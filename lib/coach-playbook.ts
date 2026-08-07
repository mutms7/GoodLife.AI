/* The parsed playbook, loaded once.
 *
 * Split from playbook.ts so that file stays importable by the tests, which read
 * the markdown off disk instead of going through the bundler's `?raw`. */

import { parsePlaybook, type Topic } from "@/lib/playbook";
import source from "@/lib/playbook.md?raw";

export const PLAYBOOK: Topic[] = parsePlaybook(source);
