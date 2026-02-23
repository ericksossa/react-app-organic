import React from 'react';
import { PageTransition } from '../../design/motion/PageTransition';

export function withTabSceneTransition<P extends object>(
  Component: React.ComponentType<P>
) {
  return function CremeTransitionComponent(props: P) {
    return (
      <PageTransition>
        <Component {...props} />
      </PageTransition>
    );
  };
}
