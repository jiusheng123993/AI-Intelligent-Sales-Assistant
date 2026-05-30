import { validate } from 'class-validator';
import { CreateExtensionUsageEventDto } from './create-extension-usage-event.dto';

function buildDto(overrides: Partial<CreateExtensionUsageEventDto> = {}) {
  const dto = new CreateExtensionUsageEventDto();
  dto.source = 'SIDEPANEL';
  dto.mode = 'suggest';
  dto.status = 'SUCCESS';
  dto.durationMs = 1200;
  dto.pageHost = 'work.weixin.qq.com';

  return Object.assign(dto, overrides);
}

describe('CreateExtensionUsageEventDto', () => {
  it('accepts a valid extension usage event', async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported event source', async () => {
    const errors = await validate(
      buildDto({ source: 'UNKNOWN' as CreateExtensionUsageEventDto['source'] }),
    );

    expect(errors.some((error) => error.property === 'source')).toBe(true);
  });

  it('rejects unsupported event status', async () => {
    const errors = await validate(
      buildDto({ status: 'PENDING' as CreateExtensionUsageEventDto['status'] }),
    );

    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it('rejects page host longer than DNS host limit', async () => {
    const errors = await validate(buildDto({ pageHost: 'a'.repeat(254) }));

    expect(errors.some((error) => error.property === 'pageHost')).toBe(true);
  });

  it('rejects negative duration', async () => {
    const errors = await validate(buildDto({ durationMs: -1 }));

    expect(errors.some((error) => error.property === 'durationMs')).toBe(true);
  });
});
