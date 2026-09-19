import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString,
  MaxLength, ValidateNested,
} from 'class-validator';
import { AutomatonKind } from '../../domain/automaton';

export class StateDto {
  @IsString() id: string;
  @IsString() @MaxLength(40) name: string;
  @IsBoolean() initial: boolean;
  @IsBoolean() accepting: boolean;
  @IsInt() x: number;
  @IsInt() y: number;
}

export class TransitionDto {
  @IsString() from: string;
  @IsString() to: string;
  @IsArray() @IsString({ each: true }) symbols: string[];
}

export class AutomatonModelDto {
  @IsOptional() @IsIn(['afd', 'afn'])
  kind?: AutomatonKind;

  @IsArray() @ValidateNested({ each: true }) @Type(() => StateDto)
  states: StateDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => TransitionDto)
  transitions: TransitionDto[];
}

export class CreateAutomatonDto {
  @IsString() @MaxLength(120) name: string;

  @IsOptional() @IsIn(['afd', 'afn'])
  kind?: AutomatonKind;

  @ValidateNested() @Type(() => AutomatonModelDto)
  model: AutomatonModelDto;
}

export class UpdateAutomatonDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;

  @IsOptional() @IsIn(['afd', 'afn'])
  kind?: AutomatonKind;

  @IsOptional() @ValidateNested() @Type(() => AutomatonModelDto)
  model?: AutomatonModelDto;
}

/** Corpo de POST /automata/determinize: um AFN a converter. */
export class DeterminizeDto {
  @ValidateNested() @Type(() => AutomatonModelDto)
  model: AutomatonModelDto;
}
