'use client';

import { useEffect, useState, useCallback } from 'react';

interface TourStep {
  target: string; // CSS selector or 'center' for modal
  title: string;
  description: string;
  position: 'right' | 'bottom' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'center',
    title: 'Welcome to Yachting Advisors!',
    description:
      'Let\u2019s take a quick tour to get you up to speed. This will only take a minute.',
    position: 'center',
  },
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    description:
      'This is your main navigation. Quickly jump between Leads, Deals, Contacts, and Analytics from here.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-leads"]',
    title: 'Leads',
    description:
      'View and manage all your incoming leads. Filter by status, search, and export to CSV.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-deals"]',
    title: 'Deals Pipeline',
    description:
      'Track your real estate deals through every stage \u2014 from Prospecting all the way to Closing. Use the Kanban board or table view.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-contacts"]',
    title: 'Contacts',
    description:
      'A unified view of all your contacts from both leads and deals, automatically merged and deduplicated.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-analytics"]',
    title: 'Analytics',
    description:
      'Monitor your pipeline value, conversion rates, deal stage distribution, and month-over-month performance.',
    position: 'right',
  },
  {
    target: 'center',
    title: 'Keyboard Shortcuts',
    description:
      'Power user tip: Press \u2318K (or Ctrl+K) to open the global search. Press ? to see all keyboard shortcuts.',
    position: 'center',
  },
  {
    target: 'center',
    title: 'You\u2019re all set!',
    description:
      'Start by exploring your Leads or creating your first Deal. You can always revisit this tour from the sidebar help icon.',
    position: 'center',
  },
];

const STORAGE_KEY = 'crm-onboarding-complete';

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  // Check if tour should show
  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        // Short delay so the page renders first
        const t = setTimeout(() => setActive(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const positionTooltip = useCallback(() => {
    const current = TOUR_STEPS[step];
    if (!current || current.target === 'center') {
      setTooltipPos(null);
      return;
    }
    const el = document.querySelector(current.target);
    if (!el) {
      setTooltipPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (current.position === 'right') {
      setTooltipPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 16,
      });
    } else if (current.position === 'bottom') {
      setTooltipPos({
        top: rect.bottom + 12,
        left: rect.left + rect.width / 2,
      });
    }
  }, [step]);

  useEffect(() => {
    if (!active) return;
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    return () => window.removeEventListener('resize', positionTooltip);
  }, [active, step, positionTooltip]);

  function handleNext() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      completeTour();
    }
  }

  function handleSkip() {
    completeTour();
  }

  function completeTour() {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const isCenter = current.position === 'center';
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  // Highlight the target element
  const targetEl = !isCenter ? document.querySelector(current.target) : null;
  const targetRect = targetEl?.getBoundingClientRect();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100]" onClick={handleSkip}>
        {/* Dark overlay with cutout for highlighted element */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 4}
                  y={targetRect.top - 4}
                  width={targetRect.width + 8}
                  height={targetRect.height + 8}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#tour-mask)"
          />
        </svg>
      </div>

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="fixed z-[101] border-2 border-[#ff7a59] rounded-lg pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip / Modal */}
      <div
        className="fixed z-[102]"
        onClick={(e) => e.stopPropagation()}
        style={
          isCenter
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : tooltipPos
            ? {
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: 'translateY(-50%)',
              }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <div
          className={`bg-white rounded-xl shadow-2xl border border-gray-200 ${
            isCenter ? 'w-[420px] p-8 text-center' : 'w-[320px] p-5'
          }`}
        >
          {/* Arrow for positioned tooltips */}
          {!isCenter && tooltipPos && (
            <div
              className="absolute w-3 h-3 bg-white border-l border-b border-gray-200 rotate-45"
              style={{ top: '50%', left: -6, marginTop: -6 }}
            />
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-3">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step
                    ? 'w-5 bg-[#ff7a59]'
                    : i < step
                    ? 'w-2 bg-[#ff7a59]/40'
                    : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          {isFirst && (
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-[#ff7a59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
              </svg>
            </div>
          )}

          <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">{current.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">{current.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isLast ? '' : 'Skip tour'}
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 text-sm text-white bg-[#ff7a59] rounded-lg hover:bg-[#e8664a] transition-colors"
              >
                {isLast ? 'Get Started' : isFirst ? 'Start Tour' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Call this to restart the tour (e.g. from a help button) */
export function resetOnboardingTour() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch {
    // ignore
  }
}
