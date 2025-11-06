/**
 * Submit clip screen
 * Multi-step wizard for submitting a new clip via URL
 */

import { useState, useEffect } from 'react';
import {
    View,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { submitClip, type SubmitClipRequest, type ClipMetadata } from '@/services/clips';
import { ApiError, getUserFriendlyMessage } from '@/lib/api';

// Import step components
import StepIndicator from '@/components/submit/StepIndicator';
import UrlInputStep from '@/components/submit/UrlInputStep';
import MetadataOverrideStep from '@/components/submit/MetadataOverrideStep';
import TagsNsfwStep from '@/components/submit/TagsNsfwStep';
import ReviewSubmitStep from '@/components/submit/ReviewSubmitStep';
import SuccessView from '@/components/submit/SuccessView';
import ErrorView from '@/components/submit/ErrorView';

type SubmissionStep = 'url' | 'metadata' | 'tags' | 'review' | 'success' | 'error';

export default function SubmitScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    
    // Step management
    const [currentStep, setCurrentStep] = useState<SubmissionStep>('url');
    const stepOrder: SubmissionStep[] = ['url', 'metadata', 'tags', 'review'];
    const currentStepIndex = stepOrder.indexOf(currentStep);

    // Form data
    const [clipUrl, setClipUrl] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [streamerOverride, setStreamerOverride] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isNsfw, setIsNsfw] = useState(false);

    // Clip metadata (from API)
    const [clipMetadata, setClipMetadata] = useState<Partial<ClipMetadata>>({});
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<{
        success: boolean;
        message: string;
        status?: 'pending' | 'approved';
        error?: string;
        canRetry?: boolean;
    } | null>(null);

    // Check authentication
    useEffect(() => {
        if (!isAuthenticated) {
            Alert.alert(
                'Login Required',
                'You must be logged in to submit clips',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Login',
                        onPress: () => router.push('/auth/login'),
                    },
                ]
            );
        }
    }, [isAuthenticated, router]);

    // Fetch clip metadata when URL changes
    const fetchClipMetadata = async (url: string) => {
        setIsLoadingMetadata(true);
        try {
            // TODO: Implement real metadata fetching
            // Extract clip ID from URL for API call
            // const clipIdMatch = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)|\/clip\/([a-zA-Z0-9_-]+)/);
            // const clipId = clipIdMatch?.[1] || clipIdMatch?.[2];
            // Call backend API: const metadata = await fetchClipMetadata(clipId);

            // MOCK DATA - Replace with real API call before production
            setClipMetadata({
                broadcaster_name: 'ExampleStreamer',
                game_name: 'Example Game',
                title: 'Amazing Play',
            });
        } catch (error) {
            console.error('Failed to fetch clip metadata:', error);
            // Continue with empty metadata - user can override
        } finally {
            setIsLoadingMetadata(false);
        }
    };

    // Step navigation
    const handleUrlNext = (url: string) => {
        setClipUrl(url);
        fetchClipMetadata(url);
        setCurrentStep('metadata');
    };

    const handleMetadataNext = () => {
        setCurrentStep('tags');
    };

    const handleTagsNext = () => {
        setCurrentStep('review');
    };

    const handleSubmit = async () => {
        if (!isAuthenticated) {
            Alert.alert('Error', 'You must be logged in to submit clips');
            return;
        }

        setIsSubmitting(true);

        try {
            const request: SubmitClipRequest = {
                clip_url: clipUrl,
                custom_title: customTitle || undefined,
                broadcaster_name_override: streamerOverride || undefined,
                tags: tags.length > 0 ? tags : undefined,
                is_nsfw: isNsfw,
            };

            const response = await submitClip(request);

            setSubmissionResult({
                success: true,
                message: response.message,
                status: response.submission.status as 'pending' | 'approved',
                canRetry: false,
            });
            setCurrentStep('success');
        } catch (error) {
            console.error('Submission error:', error);
            
            let errorMessage = 'Failed to submit clip. Please try again.';
            let errorDetails = '';
            let canRetry = true;

            if (error instanceof ApiError) {
                errorMessage = getUserFriendlyMessage(error.type);
                errorDetails = error.message;
                
                // Determine if retry is possible based on error type
                canRetry = [
                    'NETWORK',
                    'TIMEOUT',
                    'OFFLINE',
                    'SERVER',
                ].includes(error.type);
            } else if (error instanceof Error) {
                errorDetails = error.message;
            }

            setSubmissionResult({
                success: false,
                message: errorMessage,
                error: errorDetails,
                canRetry,
            });
            setCurrentStep('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Navigate back in steps
    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStep(stepOrder[currentStepIndex - 1]);
        }
    };

    // Reset and submit another
    const handleSubmitAnother = () => {
        setClipUrl('');
        setCustomTitle('');
        setStreamerOverride('');
        setTags([]);
        setIsNsfw(false);
        setClipMetadata({});
        setSubmissionResult(null);
        setCurrentStep('url');
    };

    // Navigate to feed
    const handleViewFeed = () => {
        router.push('/(tabs)');
    };

    // Retry submission after error
    const handleRetry = () => {
        setSubmissionResult(null);
        setCurrentStep('review');
    };

    // Cancel after error
    const handleCancel = () => {
        router.back();
    };

    const stepNames = ['URL', 'Details', 'Tags', 'Review'];

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView className="flex-1 bg-white">
                <View className="p-4">
                    {/* Step Indicator - only show during form steps */}
                    {currentStep !== 'success' && currentStep !== 'error' && (
                        <StepIndicator
                            currentStep={currentStepIndex}
                            totalSteps={stepOrder.length}
                            steps={stepNames}
                        />
                    )}

                    {/* Render current step */}
                    {currentStep === 'url' && (
                        <UrlInputStep
                            initialUrl={clipUrl}
                            onNext={handleUrlNext}
                        />
                    )}

                    {currentStep === 'metadata' && (
                        <MetadataOverrideStep
                            clipUrl={clipUrl}
                            detectedStreamer={clipMetadata.broadcaster_name}
                            detectedGame={clipMetadata.game_name}
                            isLoading={isLoadingMetadata}
                            customTitle={customTitle}
                            streamerOverride={streamerOverride}
                            onCustomTitleChange={setCustomTitle}
                            onStreamerOverrideChange={setStreamerOverride}
                            onNext={handleMetadataNext}
                            onBack={handleBack}
                        />
                    )}

                    {currentStep === 'tags' && (
                        <TagsNsfwStep
                            tags={tags}
                            isNsfw={isNsfw}
                            onTagsChange={setTags}
                            onNsfwChange={setIsNsfw}
                            onNext={handleTagsNext}
                            onBack={handleBack}
                        />
                    )}

                    {currentStep === 'review' && (
                        <ReviewSubmitStep
                            clipUrl={clipUrl}
                            customTitle={customTitle}
                            detectedStreamer={clipMetadata.broadcaster_name}
                            detectedGame={clipMetadata.game_name}
                            streamerOverride={streamerOverride}
                            tags={tags}
                            isNsfw={isNsfw}
                            isSubmitting={isSubmitting}
                            onSubmit={handleSubmit}
                            onBack={handleBack}
                        />
                    )}

                    {currentStep === 'success' && submissionResult?.success && (
                        <SuccessView
                            message={submissionResult.message}
                            status={submissionResult.status || 'pending'}
                            onViewFeed={handleViewFeed}
                            onSubmitAnother={handleSubmitAnother}
                        />
                    )}

                    {currentStep === 'error' && !submissionResult?.success && (
                        <ErrorView
                            title="Submission Failed"
                            message={submissionResult?.message || 'An error occurred'}
                            errorDetails={submissionResult?.error}
                            canRetry={submissionResult?.canRetry || false}
                            onRetry={handleRetry}
                            onCancel={handleCancel}
                        />
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
