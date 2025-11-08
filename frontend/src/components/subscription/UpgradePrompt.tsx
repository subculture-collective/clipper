import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PaywallModal } from './PaywallModal';
import { trackFeatureGateEncountered, trackUpgradeClick } from '../../lib/paywall-analytics';
import { useAuth } from '../../hooks/useAuth';

export interface UpgradePromptProps {
  /** Name of the feature being gated */
  featureName?: string;
  /** Custom message to display */
  message?: string;
  /** Custom CTA text (default: "Upgrade to Pro") */
  ctaText?: string;
  /** Custom link to pricing page (default: "/pricing") */
  pricingLink?: string;
  /** Whether to show modal instead of navigating to pricing page */
  useModal?: boolean;
}

/**
 * Component that displays an upgrade prompt for premium features
 */
export function UpgradePrompt({
  featureName = 'This feature',
  message,
  ctaText = 'Upgrade to Pro',
  pricingLink = '/pricing',
  useModal = false,
}: UpgradePromptProps): React.ReactElement {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const defaultMessage = `${featureName} requires an active Pro subscription`;

  // Track feature gate encounter on mount
  React.useEffect(() => {
    trackFeatureGateEncountered({
      feature: featureName,
      userId: user?.id,
    });
  }, [featureName, user?.id]);

  const handleUpgradeClick = () => {
    trackUpgradeClick({
      feature: featureName,
      userId: user?.id,
      metadata: { source: 'upgrade_prompt' },
    });

    if (useModal) {
      setShowModal(true);
    }
  };

  const upgradeButton = (
    <button
      onClick={useModal ? handleUpgradeClick : undefined}
      className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
    >
      <svg 
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>
      {ctaText}
    </button>
  );

  return (
    <>
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 text-center">
        <div className="mb-4">
          <svg 
            className="w-12 h-12 mx-auto text-purple-600 dark:text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Pro Feature
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {message || defaultMessage}
        </p>
        
        {useModal ? (
          upgradeButton
        ) : (
          <Link to={pricingLink} onClick={handleUpgradeClick}>
            {upgradeButton}
          </Link>
        )}
      </div>

      {useModal && (
        <PaywallModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          featureName={featureName}
        />
      )}
    </>
  );
}
