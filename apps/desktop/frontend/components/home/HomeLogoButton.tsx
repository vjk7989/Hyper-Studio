import { paths } from "../../paths";
import type { HomeSidebarActions } from "./home-sidebar-items";

/** The one logo-as-home-button: single a11y label, single nav action. */
export function HomeLogoButton({
  actions,
  buttonClassName,
  logoClassName,
}: {
  actions: HomeSidebarActions;
  buttonClassName: string;
  logoClassName: string;
}) {
  return (
    <button
      type="button"
      className={buttonClassName}
      aria-label="Home"
      onClick={() => actions.goTo(paths.home, { clearActiveProject: true })}
    >
      <img src="/assets/hyper-studio-logo.png" className={logoClassName} alt="Hyper-Studio" />
    </button>
  );
}
