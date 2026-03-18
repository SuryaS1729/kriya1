import Onboarding from '@blazejkustra/react-native-onboarding';

export default function NewOnboarding()  {
  return (
    <Onboarding
      introPanel={{
        title: 'Welcome to My App',
        subtitle: 'Let\'s get you started',
        button: 'Get Started',

      }}
      steps={[
        {
          title: 'Step 1',
          description: 'This is the first step of your journey',
          buttonLabel: 'Next',
          image: require('../../assets/images/b1.jpeg'),
          position: 'top',
        },
        {
          title: 'Step 2', 
          description: 'Learn about our amazing features',
          buttonLabel: 'Continue',
          image: require('../../assets/images/b2.jpeg'),
          position: 'bottom',
        },
      ]}
      onComplete={() => {

        console.log('Onboarding completed!')
      }}
      onSkip={() => console.log('Onboarding skipped')}
      onStepChange={(step) => console.log('Current step:', step)}
    />
  );
}