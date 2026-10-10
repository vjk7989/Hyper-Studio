#include <sys/prctl.h>

// CI diagnostic only: prevent a native crash from streaming a core outside
// the repository through the runner's systemd-coredump pipe.
__attribute__((constructor)) static void hyper_studio_disable_core(void) {
  (void)prctl(PR_SET_DUMPABLE, 0L, 0L, 0L, 0L);
}
