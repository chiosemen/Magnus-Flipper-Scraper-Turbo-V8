{ pkgs }:
{
  deps = [
    pkgs.nodejs-18_x
    pkgs.pnpm
  ];

  env = {
    NODE_ENV = "production";
  };
}
