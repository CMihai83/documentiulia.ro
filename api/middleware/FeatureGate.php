<?php
/**
 * Feature Gate Middleware
 * Use in API endpoints to protect feature access
 *
 * Usage:
 *   require_once __DIR__ . '/../middleware/FeatureGate.php';
 *   requireFeature('advanced_reporting', $companyId);
 */

require_once __DIR__ . '/../services/FeatureToggleService.php';

/**
 * Require a feature to be enabled for the company
 * Throws exception if feature is not available
 */
function requireFeature(string $featureId, string $companyId): array
{
    $featureService = FeatureToggleService::getInstance();
    $access = $featureService->getFeatureAccess($featureId, $companyId);

    if (!$access['enabled']) {
        $response = [
            'success' => false,
            'error' => 'feature_restricted',
            'feature_id' => $featureId,
            'reason' => $access['reason']
        ];

        // Add upgrade info for tier restrictions
        if ($access['reason'] === 'tier_required') {
            $response['required_tier'] = $access['required_tier'];
            $response['current_tier'] = $access['current_tier'];
            $response['upgrade_url'] = $access['upgrade_url'] ?? '/settings/subscription';
            $response['message'] = "This feature requires the {$access['required_tier']} plan or higher.";
        } elseif ($access['reason'] === 'persona_restricted') {
            $response['message'] = "This feature is not available for your business type.";
        } else {
            $response['message'] = "This feature is not available.";
        }

        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode($response);
        exit();
    }

    return $access;
}

/**
 * Check if feature is enabled without blocking
 * Returns true/false
 */
function hasFeature(string $featureId, string $companyId): bool
{
    $featureService = FeatureToggleService::getInstance();
    return $featureService->isEnabled($featureId, $companyId);
}

/**
 * Get feature access details without blocking
 */
function getFeatureDetails(string $featureId, string $companyId): array
{
    $featureService = FeatureToggleService::getInstance();
    return $featureService->getFeatureAccess($featureId, $companyId);
}
