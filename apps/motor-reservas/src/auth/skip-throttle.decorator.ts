import { SetMetadata } from '@nestjs/common';

export const SkipThrottle = () => SetMetadata('skip-throttle', true);
