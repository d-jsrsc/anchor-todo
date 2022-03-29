import log from "loglevel";
import chalk from "chalk";
import prefix from "loglevel-plugin-prefix";
export const isProd = process.env.NODE_ENV === "production";

const colors: any = {
  "TRACE": chalk.magenta,
  "DEBUG": chalk.cyan,
  "INFO": chalk.blue,
  "WARN": chalk.yellow,
  "ERROR": chalk.red,
};

// prefix.reg(log);
// log.enableAll();

// prefix.apply(log, {
//   format(level, name, timestamp) {
//     const upLevel = level.toUpperCase();
//     return `${chalk.gray(`[${timestamp}]`)} ${colors[upLevel](
//       level
//     )} ${chalk.green(`${name}:`)}`;
//   },
// });

// prefix.apply(log.getLogger("ContractInstance"), {
//   format(level, name, timestamp) {
//     return chalk.bold(`[${timestamp}] ${level} ${name}:`);
//   },
// });

log.setLevel(isProd ? "WARN" : "TRACE");
