import { validate } from 'class-validator';
import { SuggestDto } from './suggest.dto';

function buildDto(overrides: Partial<SuggestDto> = {}) {
  const dto = new SuggestDto();
  dto.contextText = '客户正在询问价格。';
  dto.inputText = '可以优惠';
  dto.mode = 'suggest';
  dto.locale = 'zh-CN';
  dto.platform = 'wecom';

  return Object.assign(dto, overrides);
}

describe('SuggestDto', () => {
  it('accepts a valid AI suggest request', async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported suggest mode', async () => {
    const errors = await validate(buildDto({ mode: 'invalid' as SuggestDto['mode'] }));

    expect(errors.some((error) => error.property === 'mode')).toBe(true);
  });

  it('rejects context text longer than 4000 characters', async () => {
    const errors = await validate(buildDto({ contextText: 'a'.repeat(4001) }));

    expect(errors.some((error) => error.property === 'contextText')).toBe(true);
  });

  it('rejects input text longer than 1000 characters', async () => {
    const errors = await validate(buildDto({ inputText: 'a'.repeat(1001) }));

    expect(errors.some((error) => error.property === 'inputText')).toBe(true);
  });
});
