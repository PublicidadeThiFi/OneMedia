import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { WaitlistModal } from '../components/waitlist/WaitlistModal';

type WaitlistCtx = {
  openWaitlist: (origin: string) => void;
  closeWaitlist: () => void;
};

const WaitlistContext = createContext<WaitlistCtx>({
  openWaitlist: () => {
    /* noop */
  },
  closeWaitlist: () => {
    /* noop */
  },
});

export function useWaitlist() {
  return useContext(WaitlistContext);
}

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState<string>('');

  const value = useMemo<WaitlistCtx>(() => {
    return {
      openWaitlist: (o: string) => {
        setOrigin(o);
        setIsOpen(true);
      },
      closeWaitlist: () => {
        setIsOpen(false);
      },
    };
  }, []);

  return (
    <WaitlistContext.Provider value={value}>
      {children}
      <WaitlistModal open={isOpen} origin={origin} onClose={value.closeWaitlist} />
    </WaitlistContext.Provider>
  );
}
